import { Router } from 'express'
import { google } from 'googleapis'
import { requireAuth } from '../middleware/auth'
import { getDb } from '../db/client'
import { encrypt } from '../lib/encrypt'
import { logger } from '../lib/logger'

export const calendarRouter = Router()

async function syncMemberBusy(memberId: string, auth: InstanceType<typeof google.auth.OAuth2>) {
  const now = new Date()
  // Start from beginning of current week so past events in the week are included
  const weekStart = new Date(now)
  weekStart.setUTCDate(weekStart.getUTCDate() - weekStart.getUTCDay())
  weekStart.setUTCHours(0, 0, 0, 0)
  const twoWeeksOut = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000)

  const calendar = google.calendar({ version: 'v3', auth })
  const fbRes = await calendar.freebusy.query({
    requestBody: {
      timeMin: weekStart.toISOString(),
      timeMax: twoWeeksOut.toISOString(),
      items: [{ id: 'primary' }],
    },
  })

  const busy = fbRes.data.calendars?.primary?.busy ?? []

  // Replace all slots for this member in the synced range
  await getDb()
    .deleteFrom('group_busy_slots')
    .where('member_id', '=', memberId)
    .where('starts_at', '>=', weekStart)
    .execute()

  if (busy.length === 0) return

  await getDb()
    .insertInto('group_busy_slots')
    .values(
      busy
        .filter((b) => b.start && b.end)
        .map((b) => ({
          member_id: memberId,
          starts_at: new Date(b.start!),
          ends_at: new Date(b.end!),
        }))
    )
    .execute()
}

function getOAuthClient() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI ?? 'http://localhost:4000/api/v1/calendar/google/callback'
  )
}

// Returns the Google OAuth URL for an organizer — mobile opens this in a WebBrowser session, web redirects
calendarRouter.get('/google/connect', requireAuth, async (req, res) => {
  try {
    const organizer = await getDb()
      .selectFrom('organizers')
      .select('id')
      .where('firebase_uid', '=', req.user!.uid)
      .executeTakeFirst()

    if (!organizer) {
      return res.status(404).json({ success: false, error: 'User profile not found' })
    }

    const isWeb = req.query.platform === 'web'
    const returnTo = typeof req.query.returnTo === 'string' ? req.query.returnTo : 'onboarding'
    const rawState = isWeb ? `web:${organizer.id}:${returnTo}` : organizer.id

    const oauth2Client = getOAuthClient()
    const url = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope: [
        'https://www.googleapis.com/auth/calendar.readonly',
        'https://www.googleapis.com/auth/userinfo.email',
        'https://www.googleapis.com/auth/userinfo.profile',
      ],
      state: Buffer.from(rawState).toString('base64'),
    })

    return res.json({ success: true, data: { url } })
  } catch (err) {
    logger.error('Failed to generate Google OAuth URL', { error: err instanceof Error ? err.message : String(err) })
    return res.status(500).json({ success: false, error: 'Failed to initiate calendar connection' })
  }
})

// Google redirects here — exchange code for tokens, store encrypted, deep-link back into app or web
calendarRouter.get('/google/callback', async (req, res) => {
  const { code, state, error } = req.query
  logger.info('OAuth callback received', { hasCode: !!code, hasState: !!state, hasError: !!error })
  const MOBILE_DEEP_LINK = 'klockn://calendar/callback'
  const WEB_REDIRECT = `${process.env.WEB_APP_URL ?? 'http://localhost:3000'}/onboarding`

  if (error || !code || !state) {
    const errParam = `?success=false&error=${error ?? 'missing_params'}`
    return res.redirect(`${MOBILE_DEEP_LINK}${errParam}`)
  }

  try {
    const stateDecoded = Buffer.from(state as string, 'base64').toString('utf8')
    const isWeb = stateDecoded.startsWith('web:')
    const isMemberWeb = stateDecoded.startsWith('mem-web:')
    const isJoinTokWeb = stateDecoded.startsWith('join-tok-web:')
    const isJoinGroupWeb = stateDecoded.startsWith('join-group-web:')
    const isMember = stateDecoded.startsWith('mem:') || isMemberWeb || isJoinTokWeb
    const WEB_BASE = process.env.WEB_APP_URL ?? 'http://localhost:3000'

    let entityId: string
    let memberInviteToken: string | null = null
    let webReturnTo = 'onboarding'
    if (isJoinGroupWeb) {
      entityId = stateDecoded.slice(16) // groupId — handled separately below
    } else if (isJoinTokWeb) {
      const parts = stateDecoded.slice(13).split(':')
      entityId = parts[0]
      memberInviteToken = parts[1] ?? null
    } else if (isWeb) {
      const parts = stateDecoded.slice(4).split(':')
      entityId = parts[0]
      webReturnTo = parts[1] ?? 'onboarding'
    } else if (isMemberWeb) {
      const parts = stateDecoded.slice(8).split(':')
      entityId = parts[0]
      memberInviteToken = parts[1] ?? null
    } else if (isMember) {
      entityId = stateDecoded.slice(4)
    } else {
      entityId = stateDecoded
    }

    const oauth2Client = getOAuthClient()
    const { tokens } = await oauth2Client.getToken(code as string)

    if (!tokens.refresh_token) {
      return res.redirect(`${MOBILE_DEEP_LINK}?success=false&error=no_refresh_token`)
    }

    oauth2Client.setCredentials(tokens)
    logger.info('OAuth tokens exchanged, fetching user info')
    const oauth2Api = google.oauth2({ version: 'v2', auth: oauth2Client })
    const { data: userInfo } = await oauth2Api.userinfo.get()
    const encryptedToken = encrypt(tokens.refresh_token)
    logger.info('User info fetched, writing to DB', { email: userInfo.email, isMember, isJoinGroupWeb })

    if (isJoinGroupWeb) {
      // Anonymous join via shared group link — create member from Google identity
      const groupId = entityId
      const existing = userInfo.email
        ? await getDb()
            .selectFrom('group_members')
            .select('id')
            .where('group_id', '=', groupId)
            .where('email', '=', userInfo.email)
            .executeTakeFirst()
        : null

      let memberId: string
      if (existing) {
        memberId = existing.id
      } else {
        const newMember = await getDb()
          .insertInto('group_members')
          .values({
            group_id: groupId,
            email: userInfo.email ?? `anon_${groupId}@join.klockn.internal`,
            name: userInfo.name ?? null,
            status: 'invited',
          })
          .returning('id')
          .executeTakeFirstOrThrow()
        memberId = newMember.id
      }

      await getDb()
        .insertInto('group_member_calendar_connections')
        .values({ member_id: memberId, provider: 'google', refresh_token_encrypted: encryptedToken })
        .onConflict((oc) =>
          oc.columns(['member_id', 'provider']).doUpdateSet({ refresh_token_encrypted: encryptedToken })
        )
        .execute()

      await getDb()
        .updateTable('group_members')
        .set({ status: 'calendar_connected' })
        .where('id', '=', memberId)
        .execute()

      await syncMemberBusy(memberId, oauth2Client)
      logger.info('Group join via link completed', { groupId, memberId, email: userInfo.email })
      return res.redirect(`${WEB_BASE}/join/group/${groupId}?joined=true`)
    }

    if (isMember) {
      // Store member calendar connection
      await getDb()
        .insertInto('group_member_calendar_connections')
        .values({
          member_id: entityId,
          provider: 'google',
          refresh_token_encrypted: encryptedToken,
        })
        .onConflict((oc) =>
          oc.columns(['member_id', 'provider']).doUpdateSet({ refresh_token_encrypted: encryptedToken })
        )
        .execute()

      await getDb()
        .updateTable('group_members')
        .set({ status: 'calendar_connected' })
        .where('id', '=', entityId)
        .execute()

      // Immediately sync free/busy for the next 14 days
      await syncMemberBusy(entityId, oauth2Client)

      logger.info('Group member calendar connected', { memberId: entityId, email: userInfo.email })
    } else {
      // Store organizer calendar connection
      await getDb()
        .insertInto('organizer_calendar_connections')
        .values({
          organizer_id: entityId,
          provider: 'google',
          email: userInfo.email ?? null,
          refresh_token_encrypted: encryptedToken,
        })
        .onConflict((oc) =>
          oc.columns(['organizer_id', 'provider']).doUpdateSet({
            refresh_token_encrypted: encryptedToken,
            email: userInfo.email ?? null,
          })
        )
        .execute()

      logger.info('Organizer calendar connected', { organizerId: entityId, email: userInfo.email })
    }

    if (isJoinTokWeb && memberInviteToken) {
      return res.redirect(`${WEB_BASE}/join/${memberInviteToken}?joined=true`)
    }
    if (isMemberWeb && memberInviteToken) {
      return res.redirect(`${WEB_BASE}/invite/${memberInviteToken}?connected=true`)
    }
    if (isWeb) {
      const destination = webReturnTo === 'dashboard'
        ? `${WEB_BASE}/dashboard/calendar?calendar=connected`
        : `${WEB_REDIRECT}?calendar=connected`
      return res.redirect(destination)
    }
    return res.redirect(`${MOBILE_DEEP_LINK}?success=true`)
  } catch (err) {
    logger.error('Google OAuth callback failed', { error: err instanceof Error ? err.message : String(err) })
    const WEB_BASE_ERR = process.env.WEB_APP_URL ?? 'https://klockn.com'
    try {
      const rawState = typeof req.query.state === 'string' ? Buffer.from(req.query.state, 'base64').toString('utf8') : ''
      if (rawState.startsWith('web:') || rawState.startsWith('mem-web:')) {
        return res.redirect(`${WEB_BASE_ERR}/dashboard/calendar?error=server_error`)
      }
    } catch {
      // state unreadable — fall through to mobile
    }
    return res.redirect(`${MOBILE_DEEP_LINK}?success=false&error=server_error`)
  }
})

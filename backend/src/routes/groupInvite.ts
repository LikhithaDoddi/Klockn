import crypto from 'crypto'
import { Router } from 'express'
import { z } from 'zod'
import { google } from 'googleapis'
import { requireAuth } from '../middleware/auth'
import { validate } from '../middleware/validate'
import { getDb } from '../db/client'
import { encrypt } from '../lib/encrypt'
import { logger } from '../lib/logger'

export const groupInviteRouter = Router()

// ─── GET /api/v1/groups/:id/join-link ────────────────────────────────────────
// Owner only. Generates (or returns an existing unexpired) shareable join token.

groupInviteRouter.get('/:id/join-link', requireAuth, async (req, res) => {
  try {
    const organizer = await getDb()
      .selectFrom('organizers')
      .select('id')
      .where('firebase_uid', '=', req.user!.uid)
      .executeTakeFirst()

    if (!organizer) {
      return res.status(404).json({ success: false, error: 'User profile not found' })
    }

    const group = await getDb()
      .selectFrom('groups')
      .select(['id', 'name'])
      .where('id', '=', req.params.id)
      .where('organizer_id', '=', organizer.id)
      .executeTakeFirst()

    if (!group) {
      return res.status(404).json({ success: false, error: 'Group not found' })
    }

    // Reuse any unexpired link for this group to avoid token sprawl
    const existing = await getDb()
      .selectFrom('group_join_links')
      .select(['token', 'expires_at'])
      .where('group_id', '=', group.id)
      .where('expires_at', '>', new Date())
      .orderBy('created_at', 'desc')
      .limit(1)
      .executeTakeFirst()

    const token = existing?.token ?? (() => {
      return crypto.randomBytes(32).toString('hex')
    })()

    if (!existing) {
      await getDb()
        .insertInto('group_join_links')
        .values({
          token,
          group_id: group.id,
          created_by: organizer.id,
        })
        .execute()

      logger.info('Group join link created', { groupId: group.id, organizerId: organizer.id })
    }

    const baseUrl = process.env.WEB_APP_URL ?? 'https://klockn.com'
    return res.json({
      success: true,
      data: {
        token,
        url: `${baseUrl}/join/group/${token}`,
      },
    })
  } catch (err) {
    logger.error('Failed to generate join link', { error: err instanceof Error ? err.message : String(err) })
    return res.status(500).json({ success: false, error: 'Failed to generate join link' })
  }
})

// ─── POST /api/v1/join/:token ─────────────────────────────────────────────────
// Public endpoint. Accepts a Google auth code, creates or retrieves an organizer
// account, adds them to the group, and syncs their free/busy immediately.

const joinSchema = z.object({
  googleAuthCode: z.string().min(1),
})

groupInviteRouter.post('/join/:token', validate(joinSchema), async (req, res) => {
  const { token } = req.params
  const { googleAuthCode } = req.body as z.infer<typeof joinSchema>

  try {
    // 1. Validate token
    const link = await getDb()
      .selectFrom('group_join_links')
      .select(['id', 'group_id', 'expires_at'])
      .where('token', '=', token)
      .executeTakeFirst()

    if (!link) {
      return res.status(404).json({ success: false, error: 'Invalid join link' })
    }

    if (new Date(link.expires_at) < new Date()) {
      return res.status(410).json({ success: false, error: 'This join link has expired' })
    }

    // 2. Exchange Google auth code for tokens
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI ?? 'http://localhost:4000/api/v1/calendar/google/callback'
    )

    let refreshToken: string
    try {
      const { tokens } = await oauth2Client.getToken(googleAuthCode)
      if (!tokens.refresh_token) {
        return res.status(400).json({ success: false, error: 'Google did not return a refresh token. User must re-authorize.' })
      }
      refreshToken = tokens.refresh_token
      oauth2Client.setCredentials(tokens)
    } catch (oauthErr) {
      logger.warn('Google auth code exchange failed', { error: oauthErr instanceof Error ? oauthErr.message : String(oauthErr) })
      return res.status(400).json({ success: false, error: 'Invalid or expired Google auth code' })
    }

    // 3. Fetch Google user info
    const oauth2Api = google.oauth2({ version: 'v2', auth: oauth2Client })
    const { data: userInfo } = await oauth2Api.userinfo.get()

    if (!userInfo.email) {
      return res.status(400).json({ success: false, error: 'Could not retrieve email from Google account' })
    }

    // 4. Create organizer account if none exists (upsert by email)
    let organizer = await getDb()
      .selectFrom('organizers')
      .select(['id', 'email', 'name'])
      .where('email', '=', userInfo.email)
      .executeTakeFirst()

    if (!organizer) {
      organizer = await getDb()
        .insertInto('organizers')
        .values({
          firebase_uid: `google-join-${userInfo.id ?? crypto.randomBytes(8).toString('hex')}`,
          email: userInfo.email,
          name: userInfo.name ?? null,
        })
        .returning(['id', 'email', 'name'])
        .executeTakeFirstOrThrow()

      logger.info('New organizer created via group join link', { email: userInfo.email, groupId: link.group_id })
    }

    // 5. Add to group as a member (upsert — idempotent if they join twice)
    const member = await getDb()
      .insertInto('group_members')
      .values({
        group_id: link.group_id,
        email: userInfo.email,
        name: userInfo.name ?? null,
        status: 'calendar_connected',
      })
      .onConflict((oc) =>
        oc.columns(['group_id', 'email']).doUpdateSet({
          status: 'calendar_connected',
          name: userInfo.name ?? null,
        })
      )
      .returning(['id', 'email', 'name', 'status'])
      .executeTakeFirstOrThrow()

    // 6. Store encrypted refresh token for this member
    const encryptedToken = encrypt(refreshToken)
    await getDb()
      .insertInto('group_member_calendar_connections')
      .values({
        member_id: member.id,
        provider: 'google',
        refresh_token_encrypted: encryptedToken,
      })
      .onConflict((oc) =>
        oc.columns(['member_id', 'provider']).doUpdateSet({ refresh_token_encrypted: encryptedToken })
      )
      .execute()

    // 7. Increment used_count on the link
    await getDb()
      .updateTable('group_join_links')
      .set((eb) => ({ used_count: eb('used_count', '+', 1) }))
      .where('id', '=', link.id)
      .execute()

    // 8. Sync free/busy immediately (14-day window)
    await syncMemberBusy(member.id, oauth2Client)

    // 9. Build response
    const group = await getDb()
      .selectFrom('groups')
      .select(['id', 'name'])
      .where('id', '=', link.group_id)
      .executeTakeFirstOrThrow()

    const memberCount = await getDb()
      .selectFrom('group_members')
      .select(getDb().fn.count<string>('id').as('count'))
      .where('group_id', '=', link.group_id)
      .executeTakeFirstOrThrow()

    const now = new Date()
    const twoWeeksOut = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000)
    const availability = await getDb()
      .selectFrom('group_busy_slots')
      .select(['starts_at', 'ends_at'])
      .where('member_id', '=', member.id)
      .where('starts_at', '>=', now)
      .where('starts_at', '<', twoWeeksOut)
      .orderBy('starts_at', 'asc')
      .execute()

    logger.info('User joined group via link', { email: userInfo.email, groupId: link.group_id, memberId: member.id })

    return res.status(201).json({
      success: true,
      data: {
        groupId: group.id,
        groupName: group.name,
        memberCount: Number(memberCount.count),
        availability: availability.map((s) => ({
          startsAt: s.starts_at,
          endsAt: s.ends_at,
        })),
      },
    })
  } catch (err) {
    logger.error('Failed to join group via link', { error: err instanceof Error ? err.message : String(err), token })
    return res.status(500).json({ success: false, error: 'Failed to join group' })
  }
})

async function syncMemberBusy(memberId: string, auth: InstanceType<typeof google.auth.OAuth2>) {
  const now = new Date()
  const twoWeeksOut = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000)

  const calendar = google.calendar({ version: 'v3', auth })
  const fbRes = await calendar.freebusy.query({
    requestBody: {
      timeMin: now.toISOString(),
      timeMax: twoWeeksOut.toISOString(),
      items: [{ id: 'primary' }],
    },
  })

  const busy = fbRes.data.calendars?.primary?.busy ?? []
  if (busy.length === 0) return

  await getDb()
    .deleteFrom('group_busy_slots')
    .where('member_id', '=', memberId)
    .where('starts_at', '>=', now)
    .execute()

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

import { Router } from 'express'
import { google } from 'googleapis'
import { getDb } from '../db/client'
import { logger } from '../lib/logger'

export const inviteRouter = Router()

// Validate invite token and return group context — no auth required, token is the credential
inviteRouter.get('/:token', async (req, res) => {
  try {
    const member = await getDb()
      .selectFrom('group_members')
      .innerJoin('groups', 'groups.id', 'group_members.group_id')
      .select([
        'group_members.id',
        'group_members.email',
        'group_members.name',
        'group_members.status',
        'group_members.group_id as groupId',
        'groups.name as groupName',
      ])
      .where('group_members.invite_token', '=', req.params.token)
      .executeTakeFirst()

    if (!member) {
      return res.status(404).json({ success: false, error: 'Invite not found or expired' })
    }

    return res.json({
      success: true,
      data: {
        memberId: member.id,
        email: member.email,
        name: member.name,
        status: member.status,
        groupName: member.groupName,
        groupId: member.groupId,
      },
    })
  } catch (err) {
    logger.error('Failed to load invite', { error: err instanceof Error ? err.message : String(err) })
    return res.status(500).json({ success: false, error: 'Failed to load invite' })
  }
})

// Returns a Google OAuth URL scoped to this member's invite token
inviteRouter.get('/:token/connect-calendar', async (req, res) => {
  try {
    const member = await getDb()
      .selectFrom('group_members')
      .select(['id'])
      .where('invite_token', '=', req.params.token)
      .executeTakeFirst()

    if (!member) {
      return res.status(404).json({ success: false, error: 'Invite not found' })
    }

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI ?? 'http://localhost:4000/api/v1/calendar/google/callback'
    )

    const isWeb = req.query.platform === 'web'
    const isJoinSource = req.query.source === 'join'
    const statePayload = isWeb
      ? (isJoinSource ? `join-tok-web:${member.id}:${req.params.token}` : `mem-web:${member.id}:${req.params.token}`)
      : `mem:${member.id}`
    const url = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope: [
      'https://www.googleapis.com/auth/calendar.readonly',
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile',
    ],
      state: Buffer.from(statePayload).toString('base64'),
    })

    return res.json({ success: true, data: { url } })
  } catch (err) {
    logger.error('Failed to generate member OAuth URL', { error: err instanceof Error ? err.message : String(err) })
    return res.status(500).json({ success: false, error: 'Failed to initiate calendar connection' })
  }
})

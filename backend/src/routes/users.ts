import { Router } from 'express'
import { requireAuth } from '../middleware/auth'
import { getDb } from '../db/client'

export const usersRouter = Router()

usersRouter.use(requireAuth)

usersRouter.get('/me', async (req, res) => {
  try {
    const organizer = await getDb()
      .selectFrom('organizers')
      .selectAll()
      .where('firebase_uid', '=', req.user!.uid)
      .executeTakeFirst()

    if (!organizer) {
      return res.status(404).json({ success: false, error: 'User profile not found' })
    }

    return res.json({
      success: true,
      data: {
        id: organizer.id,
        email: organizer.email,
        name: organizer.name,
        stripeAccountId: organizer.stripe_account_id,
        createdAt: organizer.created_at,
      },
    })
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Failed to fetch user profile' })
  }
})

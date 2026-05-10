import { Router } from 'express'
import { z } from 'zod'
import { requireAuth } from '../middleware/auth'
import { validate } from '../middleware/validate'
import { getDb } from '../db/client'

export const usersRouter = Router()

usersRouter.use(requireAuth)

const createUserSchema = z.object({
  name: z.string().min(1).max(100).optional(),
})

usersRouter.post('/', validate(createUserSchema), async (req, res) => {
  try {
    const existing = await getDb()
      .selectFrom('organizers')
      .select('id')
      .where('firebase_uid', '=', req.user!.uid)
      .executeTakeFirst()

    if (existing) {
      return res.status(409).json({ success: false, error: 'User profile already exists' })
    }

    const organizer = await getDb()
      .insertInto('organizers')
      .values({
        firebase_uid: req.user!.uid,
        email: req.user!.email ?? '',
        name: req.body.name ?? null,
      })
      .returningAll()
      .executeTakeFirstOrThrow()

    return res.status(201).json({
      success: true,
      data: {
        id: organizer.id,
        email: organizer.email,
        name: organizer.name,
        createdAt: organizer.created_at,
      },
    })
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Failed to create user profile' })
  }
})


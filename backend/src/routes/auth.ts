import { Router } from 'express'
import { z } from 'zod'
import { rateLimit } from 'express-rate-limit'
import * as admin from 'firebase-admin'
import { sendPasswordResetEmail } from '../lib/email'
import { logger } from '../lib/logger'

export const authRouter = Router()

const WEB_URL = process.env.WEB_APP_URL ?? 'https://klockn.com'

// Stricter than the global limiter: password reset triggers an email, so cap
// attempts to avoid abuse / bombing a victim's inbox.
const resetLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 5 })

const resetSchema = z.object({ email: z.string().email() })

// POST /api/v1/auth/password-reset — public.
// Generates a Firebase reset code, wraps it in a branded klockn.com/reset link,
// and delivers it through Resend (the same pipeline as invites) instead of
// Firebase's default sender. Always responds with success so we never reveal
// whether an account exists for the given email (account-enumeration protection).
authRouter.post('/password-reset', resetLimiter, async (req, res) => {
  const parsed = resetSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ success: false, error: 'Valid email required.' })
    return
  }

  const email = parsed.data.email.toLowerCase()

  try {
    const link = await admin.auth().generatePasswordResetLink(email)
    const oobCode = new URL(link).searchParams.get('oobCode')
    if (!oobCode) throw new Error('Reset link missing oobCode')
    await sendPasswordResetEmail({ to: email, resetUrl: `${WEB_URL}/reset?oobCode=${oobCode}` })
  } catch (err) {
    const code = (err as { code?: string }).code
    // user-not-found is expected and intentionally swallowed; log anything else.
    if (code !== 'auth/user-not-found') {
      logger.error('Password reset failed', { code, error: (err as Error).message })
    }
  }

  res.json({ success: true, data: { message: 'If an account exists, a reset link is on its way.' } })
})

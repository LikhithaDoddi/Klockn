import type { Request, Response, NextFunction } from 'express'
import * as admin from 'firebase-admin'
import { logger } from '../lib/logger'

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.replace('Bearer ', '')

  if (!token) {
    return res.status(401).json({ success: false, error: 'Missing auth token' })
  }

  if (admin.apps.length === 0) {
    logger.error('Firebase not initialized — cannot verify token')
    return res.status(503).json({ success: false, error: 'Auth service unavailable' })
  }

  try {
    const decoded = await admin.auth().verifyIdToken(token)
    req.user = { uid: decoded.uid, email: decoded.email ?? '' }
    next()
  } catch (err) {
    logger.warn('Token verification failed', { error: err instanceof Error ? err.message : String(err) })
    return res.status(401).json({ success: false, error: 'Invalid or expired token' })
  }
}

declare global {
  namespace Express {
    interface Request {
      user?: { uid: string; email: string }
    }
  }
}

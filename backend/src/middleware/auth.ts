// Auth middleware — verifies Firebase JWT on every protected route
// Attaches decoded user to req.user so route handlers can access organizer/attendee identity

import type { Request, Response, NextFunction } from 'express'
import { getAuth } from 'firebase-admin/auth'

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.replace('Bearer ', '')

  if (!token) {
    return res.status(401).json({ error: 'Missing auth token' })
  }

  try {
    const decoded = await getAuth().verifyIdToken(token)
    // Attach uid and email so downstream handlers know who's making the request
    req.user = { uid: decoded.uid, email: decoded.email ?? '' }
    next()
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' })
  }
}

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: { uid: string; email: string }
    }
  }
}

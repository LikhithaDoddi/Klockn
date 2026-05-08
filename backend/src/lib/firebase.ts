import { initializeApp, getApps, cert } from 'firebase-admin/app'
import { logger } from './logger'

export function initFirebase(): void {
  if (getApps().length > 0) return

  const { FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY } = process.env

  if (!FIREBASE_PROJECT_ID || !FIREBASE_CLIENT_EMAIL || !FIREBASE_PRIVATE_KEY) {
    logger.warn('Firebase credentials missing — auth middleware will reject all requests until configured')
    return
  }

  initializeApp({
    credential: cert({
      projectId: FIREBASE_PROJECT_ID,
      clientEmail: FIREBASE_CLIENT_EMAIL,
      privateKey: FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    }),
  })

  logger.info('Firebase Admin initialized')
}

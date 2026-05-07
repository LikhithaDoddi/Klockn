// Firebase Auth helpers — used throughout the web app for login/logout/session
// Klockn uses Firebase for identity; the backend re-verifies the JWT server-side

import { initializeApp, getApps } from 'firebase/app'
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth'

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
}

// Prevent re-initializing on hot reload in development
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]
export const auth = getAuth(app)

export const signInWithGoogle = () => signInWithPopup(auth, new GoogleAuthProvider())
export const logOut = () => signOut(auth)

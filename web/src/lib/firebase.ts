'use client'

import { initializeApp, getApps, getApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onIdTokenChanged, sendPasswordResetEmail } from 'firebase/auth'

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
}

function getFirebaseApp() {
  if (typeof window === 'undefined') throw new Error('Firebase must only be used client-side')
  return getApps().length === 0 ? initializeApp(firebaseConfig) : getApp()
}

export const auth = typeof window !== 'undefined' ? getAuth(getFirebaseApp()) : null as never

export const signInWithGoogle = () =>
  signInWithPopup(auth, new GoogleAuthProvider())

export const signOutUser = () => signOut(auth)

export const resetPassword = (email: string) => sendPasswordResetEmail(auth, email)

export { onIdTokenChanged }

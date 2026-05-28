import { initializeApp, getApps } from 'firebase/app'
import { initializeAuth, getAuth, type Persistence } from 'firebase/auth'
import AsyncStorage from '@react-native-async-storage/async-storage'

// firebase/auth ships a react-native export condition that Metro resolves correctly.
// TypeScript sees the browser types (which omit getReactNativePersistence), so we
// require() at runtime — Metro will hit the RN bundle, not the browser one.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { getReactNativePersistence } = require('firebase/auth') as {
  getReactNativePersistence: (s: typeof AsyncStorage) => Persistence
}

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
}

const isNew = getApps().length === 0
export const firebaseApp = isNew ? initializeApp(firebaseConfig) : getApps()[0]
export const auth = isNew
  ? initializeAuth(firebaseApp, { persistence: getReactNativePersistence(AsyncStorage) })
  : getAuth(firebaseApp)

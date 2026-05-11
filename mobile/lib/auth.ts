import { onIdTokenChanged, signOut as firebaseSignOut } from 'firebase/auth'
import { auth } from './firebase'
import { useAuthStore } from '@/store/authStore'
import { setAuthToken } from './api'

export function initAuthListener(): () => void {
  return onIdTokenChanged(auth, async (firebaseUser) => {
    const { setUser, setToken } = useAuthStore.getState()
    if (firebaseUser) {
      const token = await firebaseUser.getIdToken()
      setAuthToken(token)
      setToken(token)
      setUser({
        uid: firebaseUser.uid,
        email: firebaseUser.email ?? '',
        displayName: firebaseUser.displayName,
        photoURL: firebaseUser.photoURL,
      })
    } else {
      setAuthToken(null)
      setToken(null)
      setUser(null)
    }
  })
}

export async function signOut(): Promise<void> {
  await firebaseSignOut(auth)
}

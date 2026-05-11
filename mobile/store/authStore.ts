import { create } from 'zustand'

export interface AuthUser {
  uid: string
  email: string
  displayName: string | null
  photoURL: string | null
}

interface AuthState {
  user: AuthUser | null
  token: string | null
  isLoading: boolean
  isAuthenticated: boolean
  setUser: (user: AuthUser | null) => void
  setToken: (token: string | null) => void
  setLoading: (loading: boolean) => void
  signOut: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isLoading: true,
  isAuthenticated: false,

  setUser: (user) =>
    set({ user, isAuthenticated: user !== null, isLoading: false }),

  setToken: (token) => set({ token }),

  setLoading: (isLoading) => set({ isLoading }),

  signOut: () =>
    set({ user: null, token: null, isAuthenticated: false, isLoading: false }),
}))

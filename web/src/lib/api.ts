// Axios instance pre-configured for the Klockn backend API
// All API calls in the web app go through this — handles auth headers automatically

import axios from 'axios'

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000',
  headers: { 'Content-Type': 'application/json' },
})

// Attach Firebase JWT to every request so the backend can verify identity
api.interceptors.request.use(async (config) => {
  // TODO: import getAuth from firebase/auth, get current user token
  // const token = await getAuth().currentUser?.getIdToken()
  // if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Global error handler — 401s redirect to login
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

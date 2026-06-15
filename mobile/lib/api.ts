import axios from 'axios'

const BASE_URL = process.env.EXPO_PUBLIC_API_URL
if (!BASE_URL) {
  throw new Error('EXPO_PUBLIC_API_URL is not configured')
}

export const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
})

export function setAuthToken(token: string | null) {
  if (token) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`
  } else {
    delete api.defaults.headers.common['Authorization']
  }
}

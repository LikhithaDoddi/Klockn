import { api } from '@/lib/api'

jest.mock('firebase/auth', () => ({
  getAuth: () => ({ currentUser: null }),
}))

jest.mock('@/lib/firebase', () => ({
  auth: {},
}))

describe('api client', () => {
  it('has a 10 second timeout', () => {
    expect(api.defaults.timeout).toBe(10000)
  })

  it('defaults baseURL to localhost when env var is not set', () => {
    expect(api.defaults.baseURL).toBe('http://localhost:4000')
  })

  it('sets Content-Type to application/json', () => {
    expect(api.defaults.headers['Content-Type']).toBe('application/json')
  })
})

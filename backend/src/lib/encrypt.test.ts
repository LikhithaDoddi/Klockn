import { describe, it, expect, beforeAll } from 'vitest'
import { encrypt, decrypt } from './encrypt'

describe('encrypt/decrypt (AES-256-GCM)', () => {
  beforeAll(() => {
    // 32-byte key expressed as 64 hex chars
    process.env.ENCRYPTION_KEY = 'a'.repeat(64)
  })

  it('round-trips a plaintext value', () => {
    const secret = 'ya29.a0AfH6SMC-google-refresh-token'
    expect(decrypt(encrypt(secret))).toBe(secret)
  })

  it('produces different ciphertext each call (random IV)', () => {
    expect(encrypt('same-input')).not.toBe(encrypt('same-input'))
  })

  it('rejects tampered ciphertext via the GCM auth tag', () => {
    const buf = Buffer.from(encrypt('sensitive'), 'base64')
    buf[buf.length - 1] ^= 0xff // flip a bit in the ciphertext
    expect(() => decrypt(buf.toString('base64'))).toThrow()
  })
})

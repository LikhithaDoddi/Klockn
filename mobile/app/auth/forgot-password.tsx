import { useState } from 'react'
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native'
import { Link, router } from 'expo-router'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { KlocknLogo } from '@/components/KlocknLogo'
import { colors } from '@/constants/colors'

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)

  async function handleReset() {
    const trimmed = email.trim()
    if (!trimmed) return
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError('Please enter a valid email address.')
      return
    }
    setError(null)
    setLoading(true)
    try {
      // The backend generates the reset link and sends a branded email via
      // Resend, and always responds with success regardless of whether the
      // account exists (account-enumeration protection lives server-side).
      await api.post('/api/v1/auth/password-reset', { email: trimmed })
      setSent(true)
    } catch (e: unknown) {
      setError(friendlyError(e))
    } finally {
      setLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <KlocknLogo size={56} />
          <Text style={styles.title}>{sent ? 'Check your email' : 'Reset password'}</Text>
          <Text style={styles.subtitle}>
            {sent
              ? `If an account exists for ${email.trim()}, we've sent a link to reset your password.`
              : 'Enter your email and we will send you a link to reset your password.'}
          </Text>
        </View>

        <View style={styles.form}>
          {error ? <Text style={styles.errorBanner}>{error}</Text> : null}
          {sent ? (
            <Button
              label="Back to sign in"
              onPress={() => router.replace('/auth/login')}
              fullWidth
            />
          ) : (
            <>
              <Input
                label="Email"
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
              />
              <Button
                label="Send reset link"
                onPress={handleReset}
                loading={loading}
                fullWidth
              />
            </>
          )}
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Remembered it? </Text>
          <Link href="/auth/login" style={styles.link}>
            Sign in
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

function friendlyError(e: unknown): string {
  if (e && typeof e === 'object') {
    const err = e as { response?: { status?: number }; code?: string }
    if (err.response?.status === 429) {
      return 'Too many attempts. Try again in a few minutes.'
    }
    if (err.code === 'ERR_NETWORK' || !err.response) {
      return 'No internet connection.'
    }
  }
  return 'Something went wrong. Please try again.'
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: colors.dark,
  },
  container: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 80,
    paddingBottom: 40,
    gap: 40,
  },
  header: {
    alignItems: 'center',
    gap: 12,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: colors.white,
    marginTop: 4,
  },
  subtitle: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.4)',
    textAlign: 'center',
  },
  form: {
    gap: 16,
  },
  errorBanner: {
    fontSize: 14,
    color: colors.red,
    backgroundColor: 'rgba(239,68,68,0.12)',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.4)',
  },
  link: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.violet,
  },
})

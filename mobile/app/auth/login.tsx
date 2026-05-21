import { useState } from 'react'
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native'
import { Link, router } from 'expo-router'
import { signInWithEmailAndPassword, GoogleAuthProvider, signInWithCredential } from 'firebase/auth'
import * as WebBrowser from 'expo-web-browser'
import * as Google from 'expo-auth-session/providers/google'
import { makeRedirectUri } from 'expo-auth-session'
import { auth } from '@/lib/firebase'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { colors } from '@/constants/colors'

WebBrowser.maybeCompleteAuthSession()

export default function LoginScreen() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [, response, promptAsync] = Google.useAuthRequest({
    webClientId: '439208454942-siccjqv5h04rkh0ai2m34fi9blrhpa8h.apps.googleusercontent.com',
    redirectUri: makeRedirectUri({ scheme: 'klockn' }),
  })

  async function handleGoogleLogin() {
    setGoogleLoading(true)
    setError(null)
    try {
      const result = await promptAsync()
      if (result?.type === 'success' && result.authentication?.idToken) {
        const credential = GoogleAuthProvider.credential(result.authentication.idToken)
        const { user } = await signInWithCredential(auth, credential)
        await api.post('/api/v1/users', { name: user.displayName ?? '' }).catch(() => {})
        router.replace('/(tabs)/groups')
      }
    } catch {
      setError('Google sign-in failed. Try again.')
    } finally {
      setGoogleLoading(false)
    }
  }

  async function handleLogin() {
    if (!email.trim() || !password) return
    setError(null)
    setLoading(true)
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password)
      router.replace('/(tabs)/groups')
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
          <View style={styles.logoMark} />
          <Text style={styles.title}>Welcome back</Text>
          <Text style={styles.subtitle}>Sign in to your Klockn account</Text>
        </View>

        <View style={styles.form}>
          {error ? <Text style={styles.errorBanner}>{error}</Text> : null}
          <Button
            label="Continue with Google"
            onPress={handleGoogleLogin}
            loading={googleLoading}
            variant="secondary"
            fullWidth
          />
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>
          <Input
            label="Email"
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
          />
          <Input
            label="Password"
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
            secureTextEntry
            autoComplete="password"
          />
          <Button
            label="Sign in"
            onPress={handleLogin}
            loading={loading}
            fullWidth
          />
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Don't have an account? </Text>
          <Link href="/auth/signup" style={styles.link}>
            Sign up
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

function friendlyError(e: unknown): string {
  if (e && typeof e === 'object' && 'code' in e) {
    const code = (e as { code: string }).code
    if (code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found') {
      return 'Incorrect email or password.'
    }
    if (code === 'auth/too-many-requests') {
      return 'Too many attempts. Try again in a few minutes.'
    }
    if (code === 'auth/network-request-failed') {
      return 'No internet connection.'
    }
  }
  return 'Something went wrong. Please try again.'
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: colors.background,
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
  logoMark: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: colors.purple,
    marginBottom: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.ink,
  },
  subtitle: {
    fontSize: 16,
    color: colors.muted,
    textAlign: 'center',
  },
  form: {
    gap: 16,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dividerText: {
    fontSize: 13,
    color: colors.muted,
  },
  errorBanner: {
    fontSize: 14,
    color: colors.red,
    backgroundColor: '#FEF2F2',
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
    color: colors.muted,
  },
  link: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.purple,
  },
})

import { useState } from 'react'
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native'
import { Link, router } from 'expo-router'
import { signInWithEmailAndPassword, GoogleAuthProvider, OAuthProvider, signInWithCredential } from 'firebase/auth'
import * as WebBrowser from 'expo-web-browser'
import * as Google from 'expo-auth-session/providers/google'
import * as AppleAuthentication from 'expo-apple-authentication'
import { auth } from '@/lib/firebase'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { KlocknLogo } from '@/components/KlocknLogo'
import { colors } from '@/constants/colors'

WebBrowser.maybeCompleteAuthSession()

async function generateNonce(): Promise<{ raw: string; hashed: string }> {
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  const raw = Array.from(array, (b) => b.toString(16).padStart(2, '0')).join('')
  const data = new TextEncoder().encode(raw)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashed = Array.from(new Uint8Array(hashBuffer), (b) => b.toString(16).padStart(2, '0')).join('')
  return { raw, hashed }
}

export default function LoginScreen() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [appleLoading, setAppleLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [, , promptAsync] = Google.useIdTokenAuthRequest({
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
  })

  async function handleGoogleLogin() {
    setGoogleLoading(true)
    setError(null)
    try {
      const result = await promptAsync()
      if (result?.type === 'success') {
        const idToken = result.params.id_token
        const credential = GoogleAuthProvider.credential(idToken)
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

  async function handleAppleLogin() {
    setAppleLoading(true)
    setError(null)
    try {
      const { raw, hashed } = await generateNonce()
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
        nonce: hashed,
      })
      const provider = new OAuthProvider('apple.com')
      const firebaseCredential = provider.credential({
        idToken: credential.identityToken!,
        rawNonce: raw,
      })
      const { user } = await signInWithCredential(auth, firebaseCredential)
      const name = credential.fullName
        ? `${credential.fullName.givenName ?? ''} ${credential.fullName.familyName ?? ''}`.trim()
        : user.displayName ?? ''
      await api.post('/api/v1/users', { name }).catch(() => {})
      router.replace('/(tabs)/groups')
    } catch (e: unknown) {
      if (e && typeof e === 'object' && 'code' in e && (e as { code: string }).code === 'ERR_REQUEST_CANCELED') return
      setError('Apple sign-in failed. Try again.')
    } finally {
      setAppleLoading(false)
    }
  }

  async function handleLogin() {
    if (!email.trim() || !password) return
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Please enter a valid email address.')
      return
    }
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
          <KlocknLogo size={56} />
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
          {Platform.OS === 'ios' && (
            <AppleAuthentication.AppleAuthenticationButton
              buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
              buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.WHITE_OUTLINE}
              cornerRadius={12}
              style={styles.appleBtn}
              onPress={handleAppleLogin}
            />
          )}
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
  appleBtn: {
    height: 48,
    width: '100%',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  dividerText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.3)',
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

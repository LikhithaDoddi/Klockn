import { useEffect, useRef } from 'react'
import { ActivityIndicator, Platform, View } from 'react-native'
import { Stack, router } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { useAuthStore } from '@/store/authStore'
import { initAuthListener } from '@/lib/auth'
import { registerPushToken, Notifications } from '@/lib/notifications'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { initSentry, Sentry } from '@/lib/sentry'
import { colors } from '@/constants/colors'

initSentry()

function RootLayout() {
  const { isAuthenticated, isLoading } = useAuthStore()
  const notificationListener = useRef<{ remove: () => void } | null>(null)
  const responseListener = useRef<{ remove: () => void } | null>(null)

  useEffect(() => {
    const unsubscribe = initAuthListener()
    return unsubscribe
  }, [])

  // Navigation is owned by the index gate (cold start) and explicit redirects in
  // login/signup/sign-out. Here we only register for push once authenticated.
  useEffect(() => {
    if (isLoading || !isAuthenticated) return
    registerPushToken()
  }, [isAuthenticated, isLoading])

  useEffect(() => {
    if (Platform.OS === 'web') return

    notificationListener.current = Notifications.addNotificationReceivedListener(() => {})
    responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as { groupId?: string; groupName?: string }
      if (data?.groupId) {
        router.push({ pathname: '/chat/[groupId]', params: { groupId: data.groupId, groupName: data.groupName ?? 'Group' } })
      }
    })

    return () => {
      notificationListener.current?.remove()
      responseListener.current?.remove()
    }
  }, [])

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.dark }}>
        <ActivityIndicator color={colors.purple} size="large" />
      </View>
    )
  }

  return (
    <ErrorBoundary>
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="onboarding/index" />
        <Stack.Screen name="auth/login" />
        <Stack.Screen name="auth/signup" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="groups/create" />
        <Stack.Screen name="groups/[id]" />
        <Stack.Screen name="invite/[token]" options={{ headerShown: true, title: "You're Invited" }} />
        <Stack.Screen name="chat/[groupId]" />
      </Stack>
    </ErrorBoundary>
  )
}

export default Sentry.wrap(RootLayout)

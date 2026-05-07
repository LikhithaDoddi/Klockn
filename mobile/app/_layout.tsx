// Root layout for Expo Router — all screens nest inside this
// Handles auth gate: unauthenticated users are sent to /onboarding

import { Stack } from 'expo-router'

export default function RootLayout() {
  return (
    <Stack>
      {/* Public screens — no auth required */}
      <Stack.Screen name="onboarding/index" options={{ headerShown: false }} />
      {/* Auth-required screens */}
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      {/* Invite deep-link — attendees land here from email */}
      <Stack.Screen name="invite/[token]" options={{ title: 'You\'re Invited' }} />
    </Stack>
  )
}

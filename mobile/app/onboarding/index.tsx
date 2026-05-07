// Onboarding screen — shown to first-time attendees before calendar connection
// Goal: explain why Klockn needs calendar access and get consent before OAuth

import { View, Text } from 'react-native'

export default function OnboardingScreen() {
  return (
    <View>
      <Text>Klockn needs read access to your calendar</Text>
      <Text>We only check availability windows — we never read event details.</Text>
      {/* TODO: ConnectGoogleCalendarButton */}
      {/* TODO: ConnectAppleCalendarButton */}
    </View>
  )
}

// Attendee invite screen — entry point from the email invite link
// Flow: validate token → show event details → prompt calendar connect → confirm RSVP
// This is the most critical screen for attendees; keep it dead simple

import { useLocalSearchParams } from 'expo-router'
import { View, Text } from 'react-native'

export default function InviteScreen() {
  const { token } = useLocalSearchParams<{ token: string }>()

  return (
    <View>
      <Text>You've been invited!</Text>
      {/* TODO: Fetch event details using token */}
      {/* TODO: ConnectCalendarButton — triggers Google/Apple OAuth */}
      {/* TODO: On calendar connect → backend reads free/busy, attendee is marked ready */}
    </View>
  )
}

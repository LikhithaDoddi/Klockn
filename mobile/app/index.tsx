import { Redirect } from 'expo-router'
import { ActivityIndicator, View } from 'react-native'
import { useAuthStore } from '@/store/authStore'
import { colors } from '@/constants/colors'

// Root entry route. Without this, the app cold-starts on an unmatched '/' and
// shows Expo Router's "Unmatched Route" screen. A declarative <Redirect> runs
// reliably during render (unlike an imperative router.replace in an effect,
// which no-ops before the navigator mounts).
export default function Index() {
  const { isAuthenticated, isLoading } = useAuthStore()

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.dark }}>
        <ActivityIndicator color={colors.purple} size="large" />
      </View>
    )
  }

  return <Redirect href={isAuthenticated ? '/(tabs)/groups' : '/onboarding'} />
}

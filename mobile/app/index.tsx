import { ActivityIndicator, View } from 'react-native'
import { Redirect } from 'expo-router'
import { useAuthStore } from '@/store/authStore'
import { colors } from '@/constants/colors'

// Single source of truth for the app's entry route. While Firebase resolves the
// persisted session we show a spinner; once resolved we send authenticated users
// to their groups and everyone else to onboarding. Keeping this gate here (and
// out of the root layout's effects) prevents the redirect race that bounced
// returning users back to onboarding.
export default function Index() {
  const { isLoading, isAuthenticated } = useAuthStore()

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.dark }}>
        <ActivityIndicator color={colors.purple} size="large" />
      </View>
    )
  }

  return <Redirect href={isAuthenticated ? '/(tabs)/groups' : '/onboarding'} />
}

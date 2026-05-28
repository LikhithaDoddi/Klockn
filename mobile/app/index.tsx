import { Redirect } from 'expo-router'
import { ActivityIndicator, View } from 'react-native'
import { useAuthStore } from '@/store/authStore'
import { colors } from '@/constants/colors'

export default function Index() {
  const { isAuthenticated, isLoading } = useAuthStore()

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.white }}>
        <ActivityIndicator color={colors.purple} size="large" />
      </View>
    )
  }

  return <Redirect href={isAuthenticated ? '/(tabs)/groups' : '/onboarding'} />
}

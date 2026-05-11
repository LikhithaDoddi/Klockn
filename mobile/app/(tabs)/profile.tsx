import { useState } from 'react'
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { router } from 'expo-router'
import { colors } from '@/constants/colors'
import { useAuthStore } from '@/store/authStore'
import { signOut } from '@/lib/auth'

export default function ProfileScreen() {
  const { user } = useAuthStore()
  const [signingOut, setSigningOut] = useState(false)

  async function handleSignOut() {
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: async () => {
          setSigningOut(true)
          try {
            await signOut()
            router.replace('/onboarding')
          } finally {
            setSigningOut(false)
          }
        },
      },
    ])
  }

  const initials = user?.displayName
    ? user.displayName.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : user?.email?.[0]?.toUpperCase() ?? '?'

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
      <View style={styles.avatarSection}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <Text style={styles.displayName}>{user?.displayName ?? 'Your Account'}</Text>
        <Text style={styles.email}>{user?.email ?? ''}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>
        <Row label="Email" value={user?.email ?? ''} />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Integrations</Text>
        <TouchableOpacity
          style={styles.row}
          onPress={() => router.push('/(tabs)/calendar')}
          activeOpacity={0.7}
        >
          <Text style={styles.rowLabel}>Google Calendar</Text>
          <Text style={styles.rowAction}>Manage</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={styles.signOutBtn}
        onPress={handleSignOut}
        disabled={signingOut}
        activeOpacity={0.8}
      >
        <Text style={styles.signOutText}>{signingOut ? 'Signing out…' : 'Sign out'}</Text>
      </TouchableOpacity>
    </ScrollView>
  )
}

interface RowProps {
  label: string
  value: string
}

function Row({ label, value }: RowProps) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue} numberOfLines={1}>{value}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    paddingBottom: 48,
    gap: 24,
  },
  avatarSection: {
    alignItems: 'center',
    paddingTop: 40,
    paddingBottom: 8,
    gap: 8,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.purple,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  avatarText: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.white,
  },
  displayName: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.ink,
  },
  email: {
    fontSize: 14,
    color: colors.muted,
  },
  section: {
    marginHorizontal: 16,
    backgroundColor: colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 6,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  rowLabel: {
    fontSize: 15,
    color: colors.ink,
  },
  rowValue: {
    fontSize: 14,
    color: colors.muted,
    maxWidth: '55%',
  },
  rowAction: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.purple,
  },
  signOutBtn: {
    marginHorizontal: 16,
    height: 52,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.red,
    alignItems: 'center',
    justifyContent: 'center',
  },
  signOutText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.red,
  },
})

import { useCallback, useEffect, useState } from 'react'
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native'
import { useLocalSearchParams } from 'expo-router'
import * as WebBrowser from 'expo-web-browser'
import { colors } from '@/constants/colors'
import { Button } from '@/components/ui/Button'
import { api } from '@/lib/api'

interface InviteDetails {
  memberId: string
  email: string
  name: string | null
  status: string
  groupName: string
}

export default function InviteScreen() {
  const { token } = useLocalSearchParams<{ token: string }>()
  const [invite, setInvite] = useState<InviteDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [connecting, setConnecting] = useState(false)
  const [connected, setConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const res = await api.get<{ success: boolean; data: InviteDetails }>(`/api/v1/invite/${token}`)
      setInvite(res.data.data)
      if (res.data.data.status === 'calendar_connected') setConnected(true)
    } catch {
      setError('This invite link is invalid or has expired.')
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => { load() }, [load])

  async function handleConnectCalendar() {
    setConnecting(true)
    setError(null)
    try {
      const res = await api.get<{ success: boolean; data: { url: string } }>(
        `/api/v1/invite/${token}/connect-calendar`
      )
      const result = await WebBrowser.openAuthSessionAsync(res.data.data.url, 'klockn://calendar/callback')
      if (result.type === 'success') {
        setConnected(true)
      }
    } catch {
      setError('Could not connect calendar. Please try again.')
    } finally {
      setConnecting(false)
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.purple} />
      </View>
    )
  }

  if (error && !invite) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    )
  }

  if (connected) {
    return (
      <View style={styles.center}>
        <View style={styles.successIcon}>
          <Text style={styles.successEmoji}>✓</Text>
        </View>
        <Text style={styles.title}>You're all set!</Text>
        <Text style={styles.body}>
          Your calendar is connected. {invite?.groupName} can now see when you're free.
          Your event details stay private — only free/busy is shared.
        </Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.groupIconBg}>
          <Text style={styles.groupIconText}>
            {invite?.groupName?.[0]?.toUpperCase() ?? 'K'}
          </Text>
        </View>
        <Text style={styles.invitedTo}>You've been invited to</Text>
        <Text style={styles.groupName}>{invite?.groupName}</Text>
        <Text style={styles.privacy}>
          Only your free/busy times are shared — your event details stay private.
        </Text>

        {error ? <Text style={styles.errorBanner}>{error}</Text> : null}

        <Button
          label="Connect Google Calendar"
          onPress={handleConnectCalendar}
          loading={connecting}
          fullWidth
        />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    paddingHorizontal: 32,
    gap: 16,
  },
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: 24,
    justifyContent: 'center',
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 28,
    gap: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  groupIconBg: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: '#EDE9FE',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  groupIconText: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.purple,
  },
  invitedTo: {
    fontSize: 14,
    color: colors.muted,
  },
  groupName: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.ink,
    textAlign: 'center',
  },
  privacy: {
    fontSize: 13,
    color: colors.muted,
    textAlign: 'center',
    lineHeight: 19,
  },
  errorBanner: {
    fontSize: 13,
    color: colors.red,
    backgroundColor: '#FEF2F2',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 15,
    color: colors.muted,
    textAlign: 'center',
  },
  successIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#D1FAE5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  successEmoji: {
    fontSize: 32,
    color: colors.green,
    fontWeight: '700',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.ink,
  },
  body: {
    fontSize: 15,
    color: colors.muted,
    textAlign: 'center',
    lineHeight: 22,
  },
})

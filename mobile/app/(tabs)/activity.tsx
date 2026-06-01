import { useCallback, useEffect, useState } from 'react'
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs'
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import { colors } from '@/constants/colors'
import { api } from '@/lib/api'

type ActivityType = 'window_found' | 'member_joined' | 'booking' | 'invite_accepted'

interface ActivityItem {
  id: string
  type: ActivityType
  title: string
  body: string
  groupId?: string
  groupName?: string
  timestamp: number
  read: boolean
}

const ICON_MAP: Record<ActivityType, { name: React.ComponentProps<typeof Ionicons>['name']; color: string; bg: string }> = {
  window_found: { name: 'time-outline', color: colors.green, bg: 'rgba(16,185,129,0.15)' },
  member_joined: { name: 'person-add-outline', color: colors.violet, bg: 'rgba(124,58,237,0.15)' },
  booking: { name: 'receipt-outline', color: '#F59E0B', bg: 'rgba(245,158,11,0.15)' },
  invite_accepted: { name: 'checkmark-circle-outline', color: colors.green, bg: 'rgba(16,185,129,0.15)' },
}

function formatRelative(ts: number): string {
  const diff = Math.floor((Date.now() - ts) / 1000)
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

export default function ActivityScreen() {
  const insets = useSafeAreaInsets()
  const tabBarHeight = useBottomTabBarHeight()
  const [items, setItems] = useState<ActivityItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setError(null)
    try {
      const res = await api.get<{ success: boolean; data: ActivityItem[] }>('/api/v1/activity')
      setItems(res.data.data ?? [])
    } catch (e: unknown) {
      // 404 means endpoint not yet available — show empty state, not error
      const status = e && typeof e === 'object' && 'response' in e
        ? (e as { response?: { status?: number } }).response?.status
        : undefined
      if (status !== 404) setError('Could not load activity.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.purple} />
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[colors.dark, colors.darkGradientEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: insets.top + 16 }]}
      >
        <View style={styles.glow} pointerEvents="none" />
        <Text style={styles.headerTitle}>Activity</Text>
        <Text style={styles.headerSub}>Windows, joins, and bookings</Text>
      </LinearGradient>

      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <ActivityRow item={item} />}
        contentContainerStyle={[
          items.length === 0 ? styles.emptyList : styles.list,
          { paddingBottom: tabBarHeight + 24 },
        ]}
        ItemSeparatorComponent={() => <View style={styles.divider} />}
        ListEmptyComponent={
          error ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>{error}</Text>
              <TouchableOpacity onPress={load} activeOpacity={0.7}>
                <Text style={styles.retryText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <EmptyActivity />
          )
        }
      />
    </View>
  )
}

function ActivityRow({ item }: { item: ActivityItem }) {
  const icon = ICON_MAP[item.type]
  return (
    <TouchableOpacity
      style={[styles.row, !item.read && styles.rowUnread]}
      onPress={() => item.groupId && router.push(`/groups/${item.groupId}`)}
      activeOpacity={item.groupId ? 0.7 : 1}
    >
      <View style={[styles.rowIcon, { backgroundColor: icon.bg }]}>
        <Ionicons name={icon.name} size={20} color={icon.color} />
      </View>
      <View style={styles.rowBody}>
        <Text style={styles.rowTitle}>{item.title}</Text>
        <Text style={styles.rowBody2}>{item.body}</Text>
        <Text style={styles.rowTime}>{formatRelative(item.timestamp)}</Text>
      </View>
      {!item.read && <View style={styles.unreadDot} />}
    </TouchableOpacity>
  )
}

function EmptyActivity() {
  return (
    <View style={styles.emptyState}>
      <View style={styles.emptyIcon}>
        <Ionicons name="notifications-outline" size={32} color={colors.violet} />
      </View>
      <Text style={styles.emptyHeading}>Nothing yet</Text>
      <Text style={styles.emptyText}>
        When a group window opens up or someone joins, it shows up here.
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.dark,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.dark,
  },
  header: {
    paddingBottom: 20,
    paddingHorizontal: 20,
    gap: 4,
    overflow: 'hidden',
  },
  glow: {
    position: 'absolute',
    top: -40,
    right: -40,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(124,58,237,0.3)',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.white,
  },
  headerSub: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.4)',
  },
  list: {
    paddingVertical: 8,
  },
  emptyList: {
    flex: 1,
    justifyContent: 'center',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    marginLeft: 72,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    gap: 14,
  },
  rowUnread: {
    backgroundColor: 'rgba(124,58,237,0.05)',
  },
  rowIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowBody: {
    flex: 1,
    gap: 2,
  },
  rowTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.85)',
  },
  rowBody2: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.45)',
    lineHeight: 18,
  },
  rowTime: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.25)',
    marginTop: 2,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.violet,
  },
  emptyState: {
    alignItems: 'center',
    paddingHorizontal: 40,
    gap: 12,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: 'rgba(124,58,237,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyHeading: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.white,
  },
  emptyText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.4)',
    textAlign: 'center',
    lineHeight: 20,
  },
  retryText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.violet,
  },
})

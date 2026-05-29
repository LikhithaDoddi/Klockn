import { useCallback, useEffect, useState } from 'react'
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs'
import { KlocknLogo } from '@/components/KlocknLogo'
import { colors } from '@/constants/colors'
import { useGroupStore, Group } from '@/store/groupStore'
import { api } from '@/lib/api'

export default function GroupsScreen() {
  const { groups, setGroups } = useGroupStore()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const tabBarHeight = useBottomTabBarHeight()

  const load = useCallback(async () => {
    setError(null)
    try {
      const res = await api.get<{ success: boolean; data: Group[] }>('/api/v1/groups')
      setGroups(res.data.data)
    } catch {
      setError('Could not load groups. Check your connection.')
    } finally {
      setLoading(false)
    }
  }, [setGroups])

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
      {/* Header */}
      <LinearGradient
        colors={[colors.dark, colors.darkGradientEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View style={styles.glow} pointerEvents="none" />
        <View style={styles.headerContent}>
          <KlocknLogo size={28} />
          <Text style={styles.wordmark}>klockn</Text>
        </View>
        <Text style={styles.greeting}>
          Finally, a time that works for{' '}
          <Text style={styles.greetingAccent}>everyone.</Text>
        </Text>
      </LinearGradient>

      <FlatList
        data={groups}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <GroupRow group={item} />}
        contentContainerStyle={groups.length === 0 ? styles.emptyList : styles.list}
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
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <Ionicons name="people-outline" size={36} color={colors.violet} />
              </View>
              <Text style={styles.emptyHeading}>No groups yet</Text>
              <Text style={styles.emptyText}>
                Create a group to start sharing availability with your team.
              </Text>
            </View>
          )
        }
      />

      <TouchableOpacity
        style={[styles.fab, { bottom: tabBarHeight + 16 }]}
        onPress={() => router.push('/groups/create')}
        activeOpacity={0.7}
      >
        <Ionicons name="add" size={28} color={colors.white} />
      </TouchableOpacity>
    </View>
  )
}

function GroupRow({ group }: { group: Group }) {
  const initial = group.name.slice(0, 1).toUpperCase()
  return (
    <TouchableOpacity
      style={styles.row}
      onPress={() => router.push(`/groups/${group.id}`)}
      activeOpacity={0.7}
    >
      <View style={styles.rowIcon}>
        <Text style={styles.rowIconText}>{initial}</Text>
      </View>
      <View style={styles.rowBody}>
        <Text style={styles.rowName}>{group.name}</Text>
        <Text style={styles.rowMeta}>
          {group.memberCount ?? 0} {(group.memberCount ?? 0) === 1 ? 'member' : 'members'}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.2)" />
    </TouchableOpacity>
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
    paddingTop: 60,
    paddingBottom: 24,
    paddingHorizontal: 20,
    gap: 10,
    overflow: 'hidden',
  },
  glow: {
    position: 'absolute',
    top: -60,
    right: -60,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(124,58,237,0.4)',
    // React Native doesn't support blur natively here; glow is approximated via opacity
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  wordmark: {
    fontSize: 20,
    fontWeight: '300',
    color: colors.white,
    letterSpacing: 6,
  },
  greeting: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.4)',
    marginTop: 2,
  },
  greetingAccent: {
    color: colors.violet,
    fontStyle: 'italic',
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
    backgroundColor: 'rgba(255,255,255,0.06)',
    marginLeft: 72,
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    gap: 14,
  },
  rowIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(124,58,237,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(124,58,237,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowIconText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.violet,
  },
  rowBody: {
    flex: 1,
    gap: 2,
  },
  rowName: {
    fontSize: 16,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.85)',
  },
  rowMeta: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.35)',
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.purple,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.purple,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
  },
})

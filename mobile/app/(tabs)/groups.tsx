import { useCallback, useEffect, useState } from 'react'
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { colors } from '@/constants/colors'
import { useGroupStore, Group } from '@/store/groupStore'
import { api } from '@/lib/api'

export default function GroupsScreen() {
  const { groups, setGroups } = useGroupStore()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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
      <FlatList
        data={groups}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <GroupRow group={item} />}
        contentContainerStyle={groups.length === 0 ? styles.emptyList : styles.list}
        ListEmptyComponent={
          error ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>{error}</Text>
              <TouchableOpacity onPress={load}>
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
        style={styles.fab}
        onPress={() => router.push('/groups/create')}
        activeOpacity={0.85}
      >
        <Ionicons name="add" size={28} color={colors.white} />
      </TouchableOpacity>
    </View>
  )
}

function GroupRow({ group }: { group: Group }) {
  return (
    <TouchableOpacity
      style={styles.row}
      onPress={() => router.push(`/groups/${group.id}`)}
      activeOpacity={0.7}
    >
      <View style={styles.rowIcon}>
        <Text style={styles.rowIconText}>
          {group.name.slice(0, 1).toUpperCase()}
        </Text>
      </View>
      <View style={styles.rowBody}>
        <Text style={styles.rowName}>{group.name}</Text>
        <Text style={styles.rowMeta}>
          {group.memberCount ?? 0} {(group.memberCount ?? 0) === 1 ? 'member' : 'members'}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.muted} />
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  list: {
    padding: 16,
    gap: 10,
  },
  emptyList: {
    flex: 1,
    justifyContent: 'center',
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
    backgroundColor: colors.lightPurple,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyHeading: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.ink,
  },
  emptyText: {
    fontSize: 14,
    color: colors.muted,
    textAlign: 'center',
    lineHeight: 20,
  },
  retryText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.purple,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 14,
    padding: 14,
    gap: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  rowIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.lightPurple,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowIconText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.purple,
  },
  rowBody: {
    flex: 1,
    gap: 2,
  },
  rowName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.ink,
  },
  rowMeta: {
    fontSize: 13,
    color: colors.muted,
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
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
})

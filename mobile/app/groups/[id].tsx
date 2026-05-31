import { useCallback, useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { useLocalSearchParams, router } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { addDays, format, startOfWeek } from 'date-fns'
import { Ionicons } from '@expo/vector-icons'
import { colors } from '@/constants/colors'
import { api } from '@/lib/api'
import { GroupMember, BusyPeriod } from '@/store/groupStore'

interface GroupDetail {
  id: string
  name: string
  members: GroupMember[]
}

const MEMBER_COLORS = ['#7C3AED', '#F97316', '#10B981', '#3B82F6', '#EC4899', '#F59E0B']
const HOURS = Array.from({ length: 14 }, (_, i) => i + 7) // 7am–8pm
const DAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

function getTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone
  } catch {
    return 'UTC'
  }
}

export default function GroupDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const insets = useSafeAreaInsets()
  const [group, setGroup] = useState<GroupDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviting, setInviting] = useState(false)
  const [showInvite, setShowInvite] = useState(false)
  const [removingId, setRemovingId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [weekOffset, setWeekOffset] = useState(0)

  const weekStart = format(
    addDays(startOfWeek(new Date()), weekOffset * 7),
    'yyyy-MM-dd'
  )

  const load = useCallback(async (silent = false) => {
    if (!silent) setError(null)
    try {
      const res = await api.get<{ success: boolean; data: GroupDetail }>(`/api/v1/groups/${id}`, {
        params: { weekStart, timezone: getTimezone() },
      })
      setGroup(res.data.data)
    } catch {
      if (!silent) setError('Could not load group.')
    } finally {
      setLoading(false)
    }
  }, [id, weekStart])

  // On mount: refresh calendars from Google, then load
  useEffect(() => {
    let cancelled = false
    api.post(`/api/v1/groups/${id}/refresh`).catch(() => null).finally(() => {
      if (!cancelled) load()
    })
    return () => { cancelled = true }
  }, [id])

  // Reload when week changes
  useEffect(() => {
    load()
  }, [weekStart])

  async function handleManualRefresh() {
    setRefreshing(true)
    try {
      await api.post(`/api/v1/groups/${id}/refresh`)
      await load(true)
    } catch {
      // silent
    } finally {
      setRefreshing(false)
    }
  }

  async function handleRemoveMember(memberId: string, label: string) {
    Alert.alert('Remove member', `Remove ${label} from this group?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive',
        onPress: async () => {
          setRemovingId(memberId)
          try {
            await api.delete(`/api/v1/groups/${id}/members/${memberId}`)
            load()
          } catch {
            Alert.alert('Error', 'Could not remove member. Try again.')
          } finally {
            setRemovingId(null)
          }
        },
      },
    ])
  }

  async function handleDeleteGroup() {
    Alert.alert('Delete group', `Delete "${group?.name}"? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          setDeleting(true)
          try {
            await api.delete(`/api/v1/groups/${id}`)
            router.replace('/(tabs)/groups')
          } catch {
            Alert.alert('Error', 'Could not delete group. Try again.')
            setDeleting(false)
          }
        },
      },
    ])
  }

  async function handleInvite() {
    const trimmed = inviteEmail.trim()
    if (!trimmed) return
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      Alert.alert('Invalid email', 'Please enter a valid email address.')
      return
    }
    setInviting(true)
    try {
      const res = await api.post(`/api/v1/groups/${id}/invite`, { emails: [trimmed] })
      const invited = (res.data?.data as { invited?: unknown[] } | undefined)?.invited
      const alreadyMember = Array.isArray(invited) && invited.length === 0
      setInviteEmail('')
      setShowInvite(false)
      Alert.alert(
        alreadyMember ? 'Already in this group' : 'Invite sent',
        alreadyMember
          ? `${trimmed} is already a member of this group.`
          : `An invite was sent to ${trimmed}.`,
      )
      await load()
    } catch {
      Alert.alert('Error', 'Could not send invite. Check the email and try again.')
    } finally {
      setInviting(false)
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.purple} />
      </View>
    )
  }

  if (error || !group) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error ?? 'Group not found.'}</Text>
        <TouchableOpacity onPress={() => load()} activeOpacity={0.7}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
      <View style={[styles.headerRow, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={22} color={colors.violet} />
        </TouchableOpacity>
        <Text style={styles.groupName} numberOfLines={1}>{group.name}</Text>
        <TouchableOpacity
          onPress={handleManualRefresh}
          disabled={refreshing}
          style={styles.headerBtn}
          activeOpacity={0.7}
        >
          {refreshing
            ? <ActivityIndicator size="small" color={colors.violet} />
            : <Ionicons name="refresh-outline" size={18} color={colors.violet} />
          }
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => router.push({ pathname: '/chat/[groupId]', params: { groupId: id, groupName: group.name } })}
          style={styles.headerBtn}
          activeOpacity={0.7}
        >
          <Ionicons name="chatbubble-ellipses-outline" size={20} color={colors.violet} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setShowInvite((v) => !v)} style={styles.headerBtn} activeOpacity={0.7}>
          <Ionicons name="person-add-outline" size={20} color={colors.violet} />
        </TouchableOpacity>
        <TouchableOpacity onPress={handleDeleteGroup} disabled={deleting} style={styles.deleteBtn} activeOpacity={0.7}>
          <Ionicons name="trash-outline" size={18} color={colors.red} />
        </TouchableOpacity>
      </View>

      {showInvite && (
        <View style={styles.inviteBox}>
          <TextInput
            style={styles.inviteInput}
            value={inviteEmail}
            onChangeText={setInviteEmail}
            placeholder="friend@example.com"
            placeholderTextColor="rgba(255,255,255,0.25)"
            keyboardType="email-address"
            autoCapitalize="none"
            autoFocus
          />
          <TouchableOpacity
            style={[styles.inviteSendBtn, inviting && styles.inviteSendBtnDisabled]}
            onPress={handleInvite}
            disabled={inviting || !inviteEmail.trim()}
            activeOpacity={0.7}
          >
            {inviting
              ? <ActivityIndicator color={colors.white} size="small" />
              : <Text style={styles.inviteSendText}>Send</Text>
            }
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Members</Text>
        <FlatList
          data={group.members}
          keyExtractor={(m) => m.id}
          scrollEnabled={false}
          renderItem={({ item, index }) => (
            <MemberRow
              member={item}
              color={MEMBER_COLORS[index % MEMBER_COLORS.length]}
              removing={removingId === item.id}
              onRemove={() => handleRemoveMember(item.id, item.name ?? item.email)}
            />
          )}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionLabel}>Availability</Text>
          <View style={styles.weekNav}>
            <TouchableOpacity
              onPress={() => setWeekOffset((o) => o - 1)}
              disabled={weekOffset <= 0}
              style={[styles.navBtn, weekOffset <= 0 && styles.navBtnDisabled]}
              activeOpacity={0.7}
            >
              <Ionicons name="chevron-back" size={14} color={weekOffset <= 0 ? 'rgba(255,255,255,0.2)' : colors.violet} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setWeekOffset(0)} activeOpacity={0.7}>
              <Text style={styles.todayBtn}>
                {weekOffset === 0
                  ? 'This week'
                  : `${format(new Date(weekStart + 'T00:00:00'), 'MMM d')} – ${format(addDays(new Date(weekStart + 'T00:00:00'), 6), 'MMM d')}`}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setWeekOffset((o) => o + 1)}
              style={styles.navBtn}
              activeOpacity={0.7}
            >
              <Ionicons name="chevron-forward" size={14} color={colors.violet} />
            </TouchableOpacity>
          </View>
        </View>
        <MergedGrid members={group.members} weekStart={weekStart} />
      </View>
    </ScrollView>
  )
}

function MemberRow({ member, color, removing, onRemove }: {
  member: GroupMember
  color: string
  removing: boolean
  onRemove: () => void
}) {
  return (
    <View style={styles.memberRow}>
      <View style={[styles.memberAvatar, { backgroundColor: color + '30', borderColor: color + '50' }]}>
        <Text style={[styles.memberInitial, { color }]}>
          {member.name?.[0]?.toUpperCase() ?? member.email[0]?.toUpperCase() ?? '?'}
        </Text>
      </View>
      <View style={styles.memberInfo}>
        <Text style={styles.memberName}>{member.name ?? member.email}</Text>
        <Text style={styles.memberEmail}>{member.email}</Text>
      </View>
      <View style={styles.memberStatus}>
        <Text style={[styles.statusBadge, member.status === 'calendar_connected' && styles.statusConnected]}>
          {member.status === 'calendar_connected' ? 'Connected' : 'Invited'}
        </Text>
        <TouchableOpacity onPress={onRemove} disabled={removing} style={styles.removeBtn} activeOpacity={0.7}>
          {removing
            ? <ActivityIndicator size="small" color={colors.red} />
            : <Ionicons name="close-circle-outline" size={20} color="rgba(239,68,68,0.7)" />
          }
        </TouchableOpacity>
      </View>
    </View>
  )
}

function getSegments(members: GroupMember[], date: string, hour: number) {
  const connected = members.filter((m) => m.status === 'calendar_connected')
  if (connected.length === 0) return []

  const cellStart = hour * 60
  const cellEnd = (hour + 1) * 60
  const points = new Set<number>([cellStart, cellEnd])

  for (const m of connected) {
    for (const p of (m.busyPeriods ?? [])) {
      if (p.date !== date) continue
      if (p.startMinute > cellStart && p.startMinute < cellEnd) points.add(p.startMinute)
      if (p.endMinute > cellStart && p.endMinute < cellEnd) points.add(p.endMinute)
    }
  }

  const sorted = Array.from(points).sort((a, b) => a - b)
  return sorted.slice(0, -1).map((segStart, i) => {
    const segEnd = sorted[i + 1]
    const mid = (segStart + segEnd) / 2
    const busyCount = connected.filter((m) =>
      (m.busyPeriods ?? []).some((p) => p.date === date && p.startMinute <= mid && p.endMinute > mid)
    ).length
    return {
      pct: (segEnd - segStart) / 60,
      busyCount,
      freeCount: connected.length - busyCount,
      total: connected.length,
    }
  })
}

function MergedGrid({ members, weekStart }: { members: GroupMember[]; weekStart: string }) {
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = addDays(new Date(weekStart + 'T00:00:00'), i)
    return { label: DAY_LABELS[d.getDay()], date: format(d, 'yyyy-MM-dd') }
  })

  const today = format(new Date(), 'yyyy-MM-dd')
  const connected = members.filter((m) => m.status === 'calendar_connected')

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <View>
        <View style={gridStyles.headerRow}>
          <View style={gridStyles.gutter} />
          {days.map((d) => (
            <View key={d.date} style={gridStyles.dayCol}>
              <Text style={[gridStyles.dayLabel, d.date === today && gridStyles.todayLabel]}>
                {d.label}
              </Text>
            </View>
          ))}
        </View>

        {HOURS.map((hour) => (
          <View key={hour} style={gridStyles.hourRow}>
            <Text style={gridStyles.hourLabel}>
              {hour === 12 ? '12p' : hour > 12 ? `${hour - 12}p` : `${hour}a`}
            </Text>
            {days.map((d) => {
              const segs = getSegments(members, d.date, hour)
              if (segs.length === 0) {
                return <View key={d.date} style={[gridStyles.cell, gridStyles.emptyCell]} />
              }
              return (
                <View key={d.date} style={gridStyles.cell}>
                  {segs.map((seg, si) => {
                    const allFree = seg.busyCount === 0
                    const allBusy = seg.freeCount === 0
                    const bg = allFree
                      ? '#10B981'
                      : allBusy
                        ? 'rgba(239,68,68,0.25)'
                        : `rgba(167,139,250,${0.2 + (seg.freeCount / seg.total) * 0.5})`
                    return (
                      <View
                        key={si}
                        style={[
                          gridStyles.segment,
                          { flex: seg.pct, backgroundColor: bg },
                        ]}
                      />
                    )
                  })}
                </View>
              )
            })}
          </View>
        ))}

        <View style={gridStyles.legend}>
          <View style={[gridStyles.legendDot, { backgroundColor: '#10B981' }]} />
          <Text style={gridStyles.legendText}>All free</Text>
          <View style={[gridStyles.legendDot, { backgroundColor: 'rgba(167,139,250,0.5)' }]} />
          <Text style={gridStyles.legendText}>Some free</Text>
          <View style={[gridStyles.legendDot, { backgroundColor: 'rgba(239,68,68,0.25)' }]} />
          <Text style={gridStyles.legendText}>All busy</Text>
        </View>

        {connected.length === 0 && (
          <Text style={gridStyles.noData}>No members have connected their calendar yet.</Text>
        )}
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.dark },
  container: { paddingBottom: 48, gap: 20 },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.dark,
    gap: 12,
  },
  errorText: { fontSize: 15, color: 'rgba(255,255,255,0.4)', textAlign: 'center', paddingHorizontal: 32 },
  retryText: { fontSize: 15, fontWeight: '600', color: colors.violet },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 10,
  },
  backBtn: { padding: 4 },
  groupName: { flex: 1, fontSize: 20, fontWeight: '700', color: colors.white },
  headerBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(124,58,237,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(124,58,237,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(239,68,68,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  inviteBox: {
    flexDirection: 'row',
    marginHorizontal: 16,
    gap: 10,
    alignItems: 'center',
  },
  inviteInput: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 14,
    fontSize: 15,
    color: colors.white,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  inviteSendBtn: {
    height: 48,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: colors.purple,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inviteSendBtnDisabled: { opacity: 0.5 },
  inviteSendText: { fontSize: 15, fontWeight: '600', color: colors.white },
  section: {
    marginHorizontal: 16,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    padding: 16,
    gap: 12,
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionLabel: { fontSize: 13, fontWeight: '700', color: 'rgba(255,255,255,0.85)' },
  weekNav: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  navBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(124,58,237,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  navBtnDisabled: { opacity: 0.3 },
  todayBtn: { fontSize: 12, fontWeight: '600', color: colors.violet },
  separator: { height: 1, backgroundColor: 'rgba(255,255,255,0.06)' },
  memberRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  memberAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberInitial: { fontSize: 16, fontWeight: '700' },
  memberInfo: { flex: 1, gap: 2 },
  memberName: { fontSize: 15, fontWeight: '600', color: 'rgba(255,255,255,0.85)' },
  memberEmail: { fontSize: 13, color: 'rgba(255,255,255,0.35)' },
  memberStatus: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statusBadge: {
    fontSize: 11, fontWeight: '700',
    color: 'rgba(255,255,255,0.3)',
    backgroundColor: 'rgba(255,255,255,0.06)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  },
  statusConnected: { backgroundColor: 'rgba(16,185,129,0.15)', color: '#6EE7B7' },
  removeBtn: { padding: 2 },
})

const gridStyles = StyleSheet.create({
  headerRow: { flexDirection: 'row', paddingBottom: 6 },
  gutter: { width: 36 },
  dayCol: { width: 36, alignItems: 'center' },
  dayLabel: { fontSize: 11, fontWeight: '600', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase' },
  todayLabel: { color: colors.violet },
  hourRow: { flexDirection: 'row', height: 32, alignItems: 'stretch' },
  hourLabel: { width: 36, fontSize: 9, color: 'rgba(255,255,255,0.25)', textAlign: 'right', paddingRight: 4, paddingTop: 2 },
  cell: { width: 32, height: 30, margin: 2, borderRadius: 4, overflow: 'hidden', flexDirection: 'column' },
  emptyCell: { backgroundColor: 'rgba(255,255,255,0.04)' },
  segment: { width: '100%' },
  legend: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingTop: 12, justifyContent: 'center' },
  legendDot: { width: 10, height: 10, borderRadius: 3 },
  legendText: { fontSize: 11, color: 'rgba(255,255,255,0.35)', marginRight: 8 },
  noData: { fontSize: 12, color: 'rgba(255,255,255,0.25)', textAlign: 'center', paddingTop: 8 },
})

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
import { addDays, format, startOfWeek } from 'date-fns'
import { Ionicons } from '@expo/vector-icons'
import { colors } from '@/constants/colors'
import { api } from '@/lib/api'
import { GroupMember } from '@/store/groupStore'

interface GroupDetail {
  id: string
  name: string
  members: GroupMember[]
}

const MEMBER_COLORS = ['#7C3AED', '#F97316', '#10B981', '#3B82F6', '#EC4899', '#F59E0B']
const HOURS = Array.from({ length: 14 }, (_, i) => i + 7)
const DAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']
const POLL_INTERVAL = 30_000

export default function GroupDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const [group, setGroup] = useState<GroupDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviting, setInviting] = useState(false)
  const [showInvite, setShowInvite] = useState(false)

  const weekStart = format(startOfWeek(new Date()), 'yyyy-MM-dd')

  const load = useCallback(async (silent = false) => {
    if (!silent) setError(null)
    try {
      const res = await api.get<{ success: boolean; data: GroupDetail }>(`/api/v1/groups/${id}`, {
        params: { weekStart },
      })
      setGroup(res.data.data)
    } catch {
      if (!silent) setError('Could not load group.')
    } finally {
      setLoading(false)
    }
  }, [id, weekStart])

  useEffect(() => {
    load()
    const poll = setInterval(() => load(true), POLL_INTERVAL)
    return () => clearInterval(poll)
  }, [id])

  async function handleInvite() {
    if (!inviteEmail.trim()) return
    setInviting(true)
    try {
      await api.post(`/api/v1/groups/${id}/invite`, { emails: [inviteEmail.trim()] })
      setInviteEmail('')
      setShowInvite(false)
      Alert.alert('Invite sent', `An invite was sent to ${inviteEmail.trim()}.`)
      load()
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
        <TouchableOpacity onPress={() => load()}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={colors.purple} />
        </TouchableOpacity>
        <Text style={styles.groupName}>{group.name}</Text>
        <TouchableOpacity
          onPress={() => router.push({ pathname: '/chat/[groupId]', params: { groupId: id, groupName: group.name } })}
          style={styles.inviteBtn}
        >
          <Ionicons name="chatbubble-ellipses-outline" size={20} color={colors.purple} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setShowInvite((v) => !v)} style={styles.inviteBtn}>
          <Ionicons name="person-add-outline" size={20} color={colors.purple} />
        </TouchableOpacity>
      </View>

      {showInvite && (
        <View style={styles.inviteBox}>
          <TextInput
            style={styles.inviteInput}
            value={inviteEmail}
            onChangeText={setInviteEmail}
            placeholder="friend@example.com"
            placeholderTextColor={colors.muted}
            keyboardType="email-address"
            autoCapitalize="none"
            autoFocus
          />
          <TouchableOpacity
            style={[styles.inviteSendBtn, inviting && styles.inviteSendBtnDisabled]}
            onPress={handleInvite}
            disabled={inviting || !inviteEmail.trim()}
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
            <MemberRow member={item} color={MEMBER_COLORS[index % MEMBER_COLORS.length]} />
          )}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>This week's availability</Text>
        <Text style={styles.sectionSub}>Green = everyone is free</Text>
        <MergedGrid members={group.members} weekStart={weekStart} />
      </View>
    </ScrollView>
  )
}

function MemberRow({ member, color }: { member: GroupMember; color: string }) {
  return (
    <View style={styles.memberRow}>
      <View style={[styles.memberAvatar, { backgroundColor: color + '22' }]}>
        <Text style={[styles.memberInitial, { color }]}>
          {member.name?.[0]?.toUpperCase() ?? member.email[0]?.toUpperCase() ?? '?'}
        </Text>
      </View>
      <View style={styles.memberInfo}>
        <Text style={styles.memberName}>{member.name ?? member.email}</Text>
        <Text style={styles.memberEmail}>{member.email}</Text>
      </View>
    </View>
  )
}

function MergedGrid({ members, weekStart }: { members: GroupMember[]; weekStart: string }) {
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = addDays(new Date(weekStart + 'T00:00:00'), i)
    return { label: DAY_LABELS[d.getDay()], date: format(d, 'yyyy-MM-dd') }
  })

  const today = format(new Date(), 'yyyy-MM-dd')

  function allFree(date: string, hour: number): boolean {
    if (members.length === 0) return false
    return members.every((m) =>
      m.availability.some((s) => s.date === date && s.hour === hour && s.free)
    )
  }

  function freeCount(date: string, hour: number): number {
    return members.filter((m) =>
      m.availability.some((s) => s.date === date && s.hour === hour && s.free)
    ).length
  }

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <View>
        {/* Day headers */}
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

        {/* Hour rows */}
        {HOURS.map((hour) => (
          <View key={hour} style={gridStyles.hourRow}>
            <Text style={gridStyles.hourLabel}>
              {hour === 12 ? '12p' : hour > 12 ? `${hour - 12}p` : `${hour}a`}
            </Text>
            {days.map((d) => {
              const everyone = allFree(d.date, hour)
              const count = freeCount(d.date, hour)
              const opacity = members.length > 0 ? count / members.length : 0
              return (
                <View
                  key={d.date}
                  style={[
                    gridStyles.cell,
                    everyone
                      ? gridStyles.allFreeCell
                      : count > 0
                        ? [gridStyles.partialCell, { opacity: 0.3 + opacity * 0.7 }]
                        : gridStyles.busyCell,
                  ]}
                />
              )
            })}
          </View>
        ))}

        <View style={gridStyles.legend}>
          <View style={[gridStyles.legendDot, { backgroundColor: '#10B981' }]} />
          <Text style={gridStyles.legendText}>All free</Text>
          <View style={[gridStyles.legendDot, { backgroundColor: '#A78BFA' }]} />
          <Text style={gridStyles.legendText}>Some free</Text>
          <View style={[gridStyles.legendDot, { backgroundColor: '#F4F4F5' }]} />
          <Text style={gridStyles.legendText}>All busy</Text>
        </View>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.background },
  container: { paddingBottom: 48, gap: 24 },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    gap: 12,
  },
  errorText: { fontSize: 15, color: colors.muted, textAlign: 'center', paddingHorizontal: 32 },
  retryText: { fontSize: 15, fontWeight: '600', color: colors.purple },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 12,
  },
  backBtn: { padding: 4 },
  groupName: { flex: 1, fontSize: 22, fontWeight: '700', color: colors.ink },
  inviteBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.lightPurple,
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
    borderColor: colors.border,
    paddingHorizontal: 14,
    fontSize: 15,
    color: colors.ink,
    backgroundColor: colors.white,
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
    backgroundColor: colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    gap: 12,
  },
  sectionLabel: { fontSize: 13, fontWeight: '700', color: colors.ink },
  sectionSub: { fontSize: 12, color: colors.muted, marginTop: -6 },
  separator: { height: 1, backgroundColor: colors.border },
  memberRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  memberAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberInitial: { fontSize: 16, fontWeight: '700' },
  memberInfo: { flex: 1, gap: 2 },
  memberName: { fontSize: 15, fontWeight: '600', color: colors.ink },
  memberEmail: { fontSize: 13, color: colors.muted },
})

const gridStyles = StyleSheet.create({
  headerRow: { flexDirection: 'row', paddingBottom: 6 },
  gutter: { width: 36 },
  dayCol: { width: 36, alignItems: 'center' },
  dayLabel: { fontSize: 11, fontWeight: '600', color: colors.muted, textTransform: 'uppercase' },
  todayLabel: { color: colors.purple },
  hourRow: { flexDirection: 'row', height: 32 },
  hourLabel: { width: 36, fontSize: 9, color: colors.muted, textAlign: 'right', paddingRight: 4, paddingTop: 2 },
  cell: { width: 32, height: 30, margin: 2, borderRadius: 4 },
  allFreeCell: { backgroundColor: '#10B981' },
  partialCell: { backgroundColor: '#A78BFA' },
  busyCell: { backgroundColor: '#F4F4F5' },
  legend: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingTop: 12, justifyContent: 'center' },
  legendDot: { width: 10, height: 10, borderRadius: 3 },
  legendText: { fontSize: 11, color: colors.muted, marginRight: 8 },
})

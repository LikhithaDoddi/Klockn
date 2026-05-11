import { useCallback, useEffect, useState } from 'react'
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { startOfWeek, addDays, format } from 'date-fns'
import { colors } from '@/constants/colors'
import { Button } from '@/components/ui/Button'
import {
  AvailabilitySlot,
  connectGoogleCalendar,
  getCalendarStatus,
  getMyAvailability,
} from '@/lib/calendar'

const HOURS = Array.from({ length: 14 }, (_, i) => i + 7)  // 7am–8pm
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export default function CalendarScreen() {
  const [connected, setConnected] = useState<boolean | null>(null)
  const [calEmail, setCalEmail] = useState<string | null>(null)
  const [slots, setSlots] = useState<AvailabilitySlot[]>([])
  const [loading, setLoading] = useState(true)
  const [connecting, setConnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const weekStart = format(startOfWeek(new Date()), 'yyyy-MM-dd')

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const status = await getCalendarStatus()
      setConnected(status.connected)
      setCalEmail(status.email)
      if (status.connected) {
        const data = await getMyAvailability(weekStart)
        setSlots(data)
      }
    } catch {
      setError('Could not load calendar. Check your connection.')
    } finally {
      setLoading(false)
    }
  }, [weekStart])

  useEffect(() => { load() }, [load])

  async function handleConnect() {
    setConnecting(true)
    setError(null)
    try {
      const success = await connectGoogleCalendar()
      if (success) await load()
    } catch {
      setError('Could not connect Google Calendar. Try again.')
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

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity onPress={load} style={styles.retryBtn}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    )
  }

  if (!connected) {
    return (
      <View style={styles.connectContainer}>
        <View style={styles.connectCard}>
          <View style={styles.calIconBg}>
            <Text style={styles.calIconText}>📅</Text>
          </View>
          <Text style={styles.connectTitle}>Connect your calendar</Text>
          <Text style={styles.connectBody}>
            Klockn reads your Google Calendar to show your free/busy times.
            We never share your event details with anyone.
          </Text>
          <Button
            label="Connect Google Calendar"
            onPress={handleConnect}
            loading={connecting}
            fullWidth
          />
        </View>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      {calEmail ? (
        <Text style={styles.connectedLabel}>Connected: {calEmail}</Text>
      ) : null}
      <WeekGrid slots={slots} weekStart={weekStart} />
    </View>
  )
}

interface WeekGridProps {
  slots: AvailabilitySlot[]
  weekStart: string
}

function WeekGrid({ slots, weekStart }: WeekGridProps) {
  const slotSet = new Set(
    slots.filter((s) => s.free).map((s) => `${s.date}-${s.hour}`)
  )

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = addDays(new Date(weekStart + 'T00:00:00'), i)
    return { label: DAYS[d.getDay()], date: format(d, 'yyyy-MM-dd'), dayNum: format(d, 'd') }
  })

  const today = format(new Date(), 'yyyy-MM-dd')

  return (
    <ScrollView style={styles.grid} showsVerticalScrollIndicator={false}>
      {/* Day headers */}
      <View style={styles.headerRow}>
        <View style={styles.timeGutter} />
        {days.map((d) => (
          <View key={d.date} style={styles.dayHeader}>
            <Text style={[styles.dayLabel, d.date === today && styles.todayLabel]}>
              {d.label}
            </Text>
            <View style={[styles.dayNumBubble, d.date === today && styles.todayBubble]}>
              <Text style={[styles.dayNum, d.date === today && styles.todayNum]}>
                {d.dayNum}
              </Text>
            </View>
          </View>
        ))}
      </View>

      {/* Hour rows */}
      {HOURS.map((hour) => (
        <View key={hour} style={styles.hourRow}>
          <Text style={styles.hourLabel}>
            {hour === 12 ? '12p' : hour > 12 ? `${hour - 12}p` : `${hour}a`}
          </Text>
          {days.map((d) => {
            const isFree = slotSet.has(`${d.date}-${hour}`)
            return (
              <View
                key={d.date}
                style={[styles.cell, isFree && styles.freeCell]}
              />
            )
          })}
        </View>
      ))}

      <View style={styles.legend}>
        <View style={[styles.legendDot, styles.freeCell]} />
        <Text style={styles.legendText}>Free</Text>
        <View style={[styles.legendDot, styles.busyCell]} />
        <Text style={styles.legendText}>Busy</Text>
      </View>
    </ScrollView>
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
    gap: 16,
  },
  connectContainer: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: 24,
    justifyContent: 'center',
  },
  connectCard: {
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 28,
    gap: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  calIconBg: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: '#EDE9FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  calIconText: {
    fontSize: 30,
  },
  connectTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.ink,
    textAlign: 'center',
  },
  connectBody: {
    fontSize: 15,
    color: colors.muted,
    textAlign: 'center',
    lineHeight: 22,
  },
  errorText: {
    fontSize: 15,
    color: colors.muted,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  retryBtn: {
    paddingVertical: 10,
    paddingHorizontal: 24,
  },
  retryText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.purple,
  },
  connectedLabel: {
    fontSize: 12,
    color: colors.muted,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  grid: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    paddingTop: 12,
    paddingBottom: 8,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  timeGutter: {
    width: 40,
  },
  dayHeader: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  dayLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  todayLabel: {
    color: colors.purple,
  },
  dayNumBubble: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  todayBubble: {
    backgroundColor: colors.purple,
  },
  dayNum: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.ink,
  },
  todayNum: {
    color: colors.white,
  },
  hourRow: {
    flexDirection: 'row',
    height: 44,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  hourLabel: {
    width: 40,
    fontSize: 10,
    color: colors.muted,
    textAlign: 'right',
    paddingRight: 6,
    paddingTop: 4,
  },
  cell: {
    flex: 1,
    margin: 1,
    borderRadius: 3,
    backgroundColor: colors.lightGray,
  },
  freeCell: {
    backgroundColor: colors.lightGreen,
  },
  busyCell: {
    backgroundColor: colors.lightGray,
  },
  legend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 16,
    justifyContent: 'center',
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 3,
  },
  legendText: {
    fontSize: 12,
    color: colors.muted,
    marginRight: 10,
  },
})

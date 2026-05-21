import { useCallback, useEffect, useState } from 'react'
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { addDays, format, isToday, startOfWeek } from 'date-fns'
import { colors } from '@/constants/colors'
import { Button } from '@/components/ui/Button'
import {
  BusyPeriod,
  connectGoogleCalendar,
  getCalendarStatus,
  getMyAvailability,
} from '@/lib/calendar'

const HOURS = Array.from({ length: 14 }, (_, i) => i + 7) // 7am-8pm
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const ROW_H = 48

const FREE_PHRASES = [
  'wide open', 'free!', 'all yours', 'open', 'grab me',
  "ping me", 'book it', "let's go", 'available', 'catch up?',
  'your call', 'open slot', 'reach out', 'free zone', "I'm free",
  'now?', 'open door', 'holler', 'call me', 'why not?',
]

const FREE_BG = ['#F0FDF4', '#FFFBEB', '#F0F9FF', '#FFF1F2', '#F5F3FF']
const FREE_BORDER = [
  'rgba(16,185,129,0.4)', 'rgba(245,158,11,0.4)',
  'rgba(14,165,233,0.4)', 'rgba(244,63,94,0.4)', 'rgba(124,58,237,0.3)',
]
const FREE_TEXT = ['#059669', '#B45309', '#0369A1', '#BE123C', '#6D28D9']

function freeStyle(dayIdx: number, hourIdx: number, segIdx: number) {
  const i = (dayIdx * 7 + hourIdx * 3 + segIdx * 2) % 5
  const p = (dayIdx * 13 + hourIdx * 7 + segIdx * 3) % FREE_PHRASES.length
  return { bg: FREE_BG[i], border: FREE_BORDER[i], text: FREE_TEXT[i], phrase: FREE_PHRASES[p] }
}

function fmtMin(m: number) {
  const h = Math.floor(m / 60)
  const min = m % 60
  const ampm = h >= 12 ? 'pm' : 'am'
  const h12 = h > 12 ? h - 12 : h === 0 ? 12 : h
  return min === 0 ? `${h12}${ampm}` : `${h12}:${String(min).padStart(2, '0')}${ampm}`
}

function hourLabel(h: number) {
  if (h === 12) return '12p'
  return h > 12 ? `${h - 12}p` : `${h}a`
}

interface Segment { type: 'free' | 'busy'; pct: number; exactLabel?: string }

function getSegments(date: string, hour: number, busyPeriods: BusyPeriod[]): Segment[] {
  const cellStart = hour * 60
  const cellEnd = (hour + 1) * 60
  const relevant = busyPeriods
    .filter(p => p.date === date && p.startMinute < cellEnd && p.endMinute > cellStart)
    .sort((a, b) => a.startMinute - b.startMinute)
  if (relevant.length === 0) return [{ type: 'free', pct: 1 }]
  const segs: Segment[] = []
  let cursor = cellStart
  for (const p of relevant) {
    const busyStart = Math.max(p.startMinute, cellStart)
    const busyEnd = Math.min(p.endMinute, cellEnd)
    if (busyStart > cursor) segs.push({ type: 'free', pct: (busyStart - cursor) / 60 })
    let exactLabel: string | undefined
    if (p.startMinute % 60 !== 0 || p.endMinute % 60 !== 0) {
      exactLabel = `${fmtMin(p.startMinute)}-${fmtMin(p.endMinute)}`
    }
    segs.push({ type: 'busy', pct: (busyEnd - busyStart) / 60, exactLabel })
    cursor = busyEnd
  }
  if (cursor < cellEnd) segs.push({ type: 'free', pct: (cellEnd - cursor) / 60 })
  return segs
}

export default function CalendarScreen() {
  const [connected, setConnected] = useState<boolean | null>(null)
  const [calEmail, setCalEmail] = useState<string | null>(null)
  const [busyPeriods, setBusyPeriods] = useState<BusyPeriod[]>([])
  const [loading, setLoading] = useState(true)
  const [connecting, setConnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [weekOffset, setWeekOffset] = useState(0)

  const weekStart = format(
    (() => { const d = startOfWeek(new Date()); d.setDate(d.getDate() + weekOffset * 7); return d })(),
    'yyyy-MM-dd'
  )

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = addDays(new Date(weekStart + 'T00:00:00'), i)
    return {
      label: DAYS[d.getDay()],
      date: format(d, 'yyyy-MM-dd'),
      num: format(d, 'd'),
      isToday: isToday(d),
      isWeekend: d.getDay() === 0 || d.getDay() === 6,
    }
  })

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const status = await getCalendarStatus()
      setConnected(status.connected)
      setCalEmail(status.email)
      if (status.connected) {
        const periods = await getMyAvailability(weekStart)
        setBusyPeriods(periods)
      }
    } catch {
      setError('Could not load calendar. Check your connection.')
    } finally {
      setLoading(false)
    }
  }, [weekStart])

  useEffect(() => { load() }, [load])

  async function handleConnect() {
    setConnecting(true); setError(null)
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
      <View style={s.center}>
        <ActivityIndicator color={colors.purple} size="large" />
      </View>
    )
  }

  if (error) {
    return (
      <View style={s.center}>
        <Text style={s.errorText}>{error}</Text>
        <TouchableOpacity onPress={load} style={s.retryBtn}>
          <Text style={s.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    )
  }

  if (!connected) {
    return (
      <View style={s.connectWrap}>
        <View style={s.connectCard}>
          <View style={s.connectIcon}>
            <Text style={{ fontSize: 32 }}>📅</Text>
          </View>
          <Text style={s.connectTitle}>Connect your calendar</Text>
          <Text style={s.connectBody}>
            Klockn reads your Google Calendar to show your free/busy times.
            We never share your event details with anyone.
          </Text>
          <Button label="Connect Google Calendar" onPress={handleConnect} loading={connecting} fullWidth />
        </View>
      </View>
    )
  }

  return (
    <View style={s.container}>
      {/* Week nav */}
      <View style={s.nav}>
        <TouchableOpacity style={s.navBtn} onPress={() => setWeekOffset(w => w - 1)}>
          <Text style={s.navBtnText}>‹</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.todayBtn, weekOffset === 0 && s.todayBtnActive]}
          onPress={() => setWeekOffset(0)}
        >
          <Text style={[s.todayBtnText, weekOffset === 0 && s.todayBtnTextActive]}>Today</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.navBtn} onPress={() => setWeekOffset(w => w + 1)}>
          <Text style={s.navBtnText}>›</Text>
        </TouchableOpacity>
        <Text style={s.weekRange}>
          {format(new Date(weekStart + 'T00:00:00'), 'MMM d')} –{' '}
          {format(addDays(new Date(weekStart + 'T00:00:00'), 6), 'MMM d')}
        </Text>
      </View>

      {calEmail && (
        <Text style={s.connectedBadge}>● {calEmail}</Text>
      )}

      <ScrollView style={s.grid} showsVerticalScrollIndicator={false}>
        {/* Day headers */}
        <View style={g.headerRow}>
          <View style={g.gutter} />
          {days.map(d => (
            <View key={d.date} style={[g.dayCol, d.isWeekend && g.weekendCol]}>
              <Text style={[g.dayLabel, d.isToday && g.todayLabel]}>{d.label}</Text>
              <View style={[g.dayNumBubble, d.isToday && g.todayBubble]}>
                <Text style={[g.dayNum, d.isToday && g.todayNum]}>{d.num}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Hour rows */}
        {HOURS.map((hour, hourIdx) => (
          <View key={hour} style={g.hourRow}>
            <Text style={g.hourLabel}>{hourLabel(hour)}</Text>
            {days.map((d, dayIdx) => {
              const segments = getSegments(d.date, hour, busyPeriods)
              let topPct = 0
              return (
                <View key={d.date} style={[g.cell, d.isWeekend && g.weekendCell]}>
                  {segments.map((seg, segIdx) => {
                    const heightPct = seg.pct
                    const top = topPct * ROW_H
                    const height = Math.max(heightPct * ROW_H, 4)
                    topPct += heightPct

                    if (seg.type === 'busy') {
                      return (
                        <View key={segIdx} style={[g.busyBlock, { top, height }]}>
                          {height > 18 && <Text style={g.lockIcon}>🔒</Text>}
                          {seg.exactLabel && (
                            <Text style={g.exactLabel}>{seg.exactLabel}</Text>
                          )}
                        </View>
                      )
                    }

                    const fs = freeStyle(dayIdx, hourIdx, segIdx)
                    return (
                      <View key={segIdx} style={[g.freeBlock, { top, height, backgroundColor: fs.bg, borderColor: fs.border }]}>
                        {height > 20 && (
                          <Text style={[g.freeText, { color: fs.text }]} numberOfLines={1}>
                            {fs.phrase}
                          </Text>
                        )}
                      </View>
                    )
                  })}
                </View>
              )
            })}
          </View>
        ))}

        {/* Legend */}
        <View style={g.legend}>
          <View style={[g.legendDot, { backgroundColor: '#111' }]} />
          <Text style={g.legendText}>Busy</Text>
          <View style={[g.legendDot, { backgroundColor: '#F0FDF4', borderWidth: 1, borderColor: 'rgba(16,185,129,0.4)' }]} />
          <Text style={g.legendText}>Free</Text>
        </View>
      </ScrollView>
    </View>
  )
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background, gap: 16 },
  errorText: { fontSize: 15, color: colors.muted, textAlign: 'center', paddingHorizontal: 32 },
  retryBtn: { paddingVertical: 10, paddingHorizontal: 24 },
  retryText: { fontSize: 15, fontWeight: '600', color: colors.purple },
  connectWrap: { flex: 1, backgroundColor: colors.background, paddingHorizontal: 24, justifyContent: 'center' },
  connectCard: { backgroundColor: colors.white, borderRadius: 20, padding: 28, gap: 16, alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  connectIcon: { width: 64, height: 64, borderRadius: 16, backgroundColor: '#EDE9FE', alignItems: 'center', justifyContent: 'center' },
  connectTitle: { fontSize: 20, fontWeight: '700', color: colors.ink, textAlign: 'center' },
  connectBody: { fontSize: 15, color: colors.muted, textAlign: 'center', lineHeight: 22 },
  nav: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 10, backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.border },
  navBtn: { width: 34, height: 34, borderRadius: 10, backgroundColor: colors.lightGray, alignItems: 'center', justifyContent: 'center' },
  navBtnText: { fontSize: 18, fontWeight: '700', color: colors.muted },
  todayBtn: { paddingHorizontal: 12, height: 34, borderRadius: 10, backgroundColor: colors.lightGray, alignItems: 'center', justifyContent: 'center' },
  todayBtnActive: { backgroundColor: colors.purple },
  todayBtnText: { fontSize: 12, fontWeight: '700', color: colors.muted },
  todayBtnTextActive: { color: colors.white },
  weekRange: { flex: 1, fontSize: 13, fontWeight: '600', color: colors.ink, marginLeft: 4 },
  connectedBadge: { fontSize: 12, color: colors.green, paddingHorizontal: 16, paddingVertical: 6, backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.border },
  grid: { flex: 1 },
})

const g = StyleSheet.create({
  headerRow: { flexDirection: 'row', paddingTop: 10, paddingBottom: 6, backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.border },
  gutter: { width: 38 },
  dayCol: { flex: 1, alignItems: 'center', gap: 4 },
  weekendCol: { opacity: 0.4 },
  dayLabel: { fontSize: 10, fontWeight: '700', color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.5 },
  todayLabel: { color: colors.purple },
  dayNumBubble: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  todayBubble: { backgroundColor: colors.purple },
  dayNum: { fontSize: 13, fontWeight: '700', color: colors.ink },
  todayNum: { color: colors.white },
  hourRow: { flexDirection: 'row', height: ROW_H, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.04)' },
  hourLabel: { width: 38, fontSize: 9, color: colors.muted, textAlign: 'right', paddingRight: 5, paddingTop: 4, fontVariant: ['tabular-nums'] },
  cell: { flex: 1, position: 'relative', borderLeftWidth: 1, borderLeftColor: 'rgba(0,0,0,0.04)' },
  weekendCell: { backgroundColor: 'rgba(0,0,0,0.012)' },
  busyBlock: {
    position: 'absolute', left: 2, right: 2,
    borderRadius: 6, backgroundColor: '#111',
    alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden',
  },
  lockIcon: { fontSize: 10 },
  exactLabel: { position: 'absolute', bottom: 2, right: 4, fontSize: 7, fontWeight: '800', color: 'rgba(255,255,255,0.4)' },
  freeBlock: {
    position: 'absolute', left: 2, right: 2,
    borderRadius: 6, borderWidth: 1, borderStyle: 'dashed',
    alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden',
  },
  freeText: { fontSize: 8, fontWeight: '800', paddingHorizontal: 2 },
  legend: { flexDirection: 'row', alignItems: 'center', gap: 6, padding: 16, justifyContent: 'center' },
  legendDot: { width: 12, height: 12, borderRadius: 3 },
  legendText: { fontSize: 11, color: colors.muted, marginRight: 10 },
})

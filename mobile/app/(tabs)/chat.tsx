import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
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
import { useGroupStore, Group } from '@/store/groupStore'
import { useChatStore, ChatMessage, BookingSuggestion } from '@/store/chatStore'

function genId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

const SUGGESTIONS = [
  'When is everyone free next week?',
  'Find a time for dinner this weekend',
  'Suggest a restaurant for the group',
  'Book something for Saturday evening',
]

export default function AIChatScreen() {
  const insets = useSafeAreaInsets()
  const tabBarHeight = useBottomTabBarHeight()

  const { groups, setGroups } = useGroupStore()
  const { messages, addMessage } = useChatStore()

  const [groupsLoading, setGroupsLoading] = useState(groups.length === 0)
  const [groupsError, setGroupsError] = useState<string | null>(null)
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(groups[0]?.id ?? null)

  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const listRef = useRef<FlatList>(null)

  const thread = selectedGroupId ? messages[selectedGroupId] ?? [] : []
  const selectedGroup = groups.find((g) => g.id === selectedGroupId) ?? null

  const loadGroups = useCallback(async () => {
    setGroupsError(null)
    try {
      const res = await api.get<{ success: boolean; data: Group[] }>('/api/v1/groups')
      setGroups(res.data.data)
      setSelectedGroupId((prev) => prev ?? res.data.data[0]?.id ?? null)
    } catch {
      setGroupsError('Could not load your groups. Check your connection.')
    } finally {
      setGroupsLoading(false)
    }
  }, [setGroups])

  useEffect(() => {
    if (groups.length === 0) loadGroups()
  }, [loadGroups, groups.length])

  // Keep a selection valid as groups change.
  useEffect(() => {
    if (!selectedGroupId && groups.length > 0) setSelectedGroupId(groups[0].id)
  }, [groups, selectedGroupId])

  // Seed a per-group welcome message the first time a group thread is opened.
  useEffect(() => {
    if (selectedGroupId && (messages[selectedGroupId]?.length ?? 0) === 0) {
      addMessage(selectedGroupId, {
        id: 'welcome',
        role: 'assistant',
        content: `Hi! Ask me anything about ${selectedGroup?.name ?? 'this group'} — I can find free windows, suggest places, and help you book.`,
        timestamp: new Date(),
      })
    }
  }, [selectedGroupId])

  const scrollToBottom = useCallback(() => {
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100)
  }, [])

  useEffect(() => { scrollToBottom() }, [thread.length, scrollToBottom])

  async function send(text: string) {
    const trimmed = text.trim()
    if (!trimmed || sending || !selectedGroupId) return
    setInput('')
    setSending(true)

    addMessage(selectedGroupId, {
      id: genId(),
      role: 'user',
      content: trimmed,
      timestamp: new Date(),
    })

    try {
      const history = (messages[selectedGroupId] ?? [])
        .filter((m) => m.id !== 'welcome')
        .map((m) => ({ role: m.role, content: m.content }))
      const res = await api.post<{ success: boolean; data: { reply: string; suggestion?: BookingSuggestion | null } }>(
        '/api/v1/ai/chat',
        {
          groupId: selectedGroupId,
          message: trimmed,
          history,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
        { timeout: 45000 }, // AI replies can take longer than the default 10s
      )
      addMessage(selectedGroupId, {
        id: genId(),
        role: 'assistant',
        content: res.data.data.reply,
        timestamp: new Date(),
        bookingSuggestion: res.data.data.suggestion ?? undefined,
      })
    } catch {
      addMessage(selectedGroupId, {
        id: genId(),
        role: 'assistant',
        content: "Sorry, I couldn't reach the AI right now. Try again in a moment.",
        timestamp: new Date(),
      })
    } finally {
      setSending(false)
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}
    >
      <LinearGradient
        colors={[colors.dark, colors.darkGradientEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: insets.top + 16 }]}
      >
        <View style={styles.glow} pointerEvents="none" />
        <View style={styles.headerRow}>
          <View style={styles.aiAvatar}>
            <Ionicons name="sparkles" size={18} color={colors.violet} />
          </View>
          <View>
            <Text style={styles.headerTitle}>Klockn AI</Text>
            <Text style={styles.headerSub}>Book anything for your group</Text>
          </View>
        </View>

        {groups.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.pills}
          >
            {groups.map((g) => {
              const active = g.id === selectedGroupId
              return (
                <TouchableOpacity
                  key={g.id}
                  style={[styles.pill, active && styles.pillActive]}
                  onPress={() => setSelectedGroupId(g.id)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.pillText, active && styles.pillTextActive]} numberOfLines={1}>
                    {g.name}
                  </Text>
                </TouchableOpacity>
              )
            })}
          </ScrollView>
        )}
      </LinearGradient>

      {groupsLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.purple} />
        </View>
      ) : groupsError ? (
        <View style={styles.center}>
          <Text style={styles.stateText}>{groupsError}</Text>
          <TouchableOpacity onPress={loadGroups} activeOpacity={0.7}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : groups.length === 0 ? (
        <View style={styles.center}>
          <View style={styles.emptyAiIcon}>
            <Ionicons name="people-outline" size={32} color={colors.violet} />
          </View>
          <Text style={styles.emptyTitle}>No groups yet</Text>
          <Text style={styles.stateText}>
            Create a group first — Klockn AI works across a group's shared availability.
          </Text>
          <TouchableOpacity
            style={styles.createBtn}
            onPress={() => router.push('/groups/create')}
            activeOpacity={0.8}
          >
            <Text style={styles.createBtnText}>Create a group</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <FlatList
            ref={listRef}
            data={thread}
            keyExtractor={(m) => m.id}
            contentContainerStyle={[styles.messageList, { paddingBottom: tabBarHeight + 80 }]}
            renderItem={({ item }) => <MessageBubble message={item} />}
            ListHeaderComponent={thread.length <= 1 ? <Suggestions onSuggest={send} /> : null}
            onContentSizeChange={scrollToBottom}
          />

          {sending && (
            <View style={[styles.typingRow, { bottom: tabBarHeight + 68 }]}>
              <View style={styles.typingBubble}>
                <ActivityIndicator size="small" color={colors.violet} />
                <Text style={styles.typingText}>Klockn is thinking...</Text>
              </View>
            </View>
          )}

          <View style={[styles.inputBar, { paddingBottom: tabBarHeight + 8 }]}>
            <TextInput
              style={styles.input}
              value={input}
              onChangeText={setInput}
              placeholder="Ask me anything..."
              placeholderTextColor="rgba(255,255,255,0.25)"
              multiline
              maxLength={500}
              returnKeyType="send"
              onSubmitEditing={() => send(input)}
            />
            <TouchableOpacity
              style={[styles.sendBtn, (!input.trim() || sending) && styles.sendBtnDisabled]}
              onPress={() => send(input)}
              disabled={!input.trim() || sending}
              activeOpacity={0.7}
            >
              <Ionicons name="arrow-up" size={20} color={colors.white} />
            </TouchableOpacity>
          </View>
        </>
      )}
    </KeyboardAvoidingView>
  )
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user'
  return (
    <View style={[styles.bubbleRow, isUser && styles.bubbleRowUser]}>
      {!isUser && (
        <View style={styles.aiBubbleAvatar}>
          <Ionicons name="sparkles" size={12} color={colors.violet} />
        </View>
      )}
      <View style={styles.bubbleCol}>
        <View style={[styles.bubble, isUser ? styles.userBubble : styles.aiBubble]}>
          <Text style={[styles.bubbleText, isUser && styles.userBubbleText]}>
            {message.content}
          </Text>
        </View>
        {message.bookingSuggestion && <BookingCard suggestion={message.bookingSuggestion} />}
      </View>
    </View>
  )
}

function BookingCard({ suggestion }: { suggestion: BookingSuggestion }) {
  return (
    <View style={styles.bookingCard}>
      <View style={styles.bookingCardHeader}>
        <Ionicons name="calendar" size={16} color={colors.violet} />
        <Text style={styles.bookingCardTitle}>Suggested time</Text>
      </View>
      <Text style={styles.bookingTitle}>{suggestion.title}</Text>
      {suggestion.datetime ? (
        <Text style={styles.bookingTime}>
          {suggestion.datetime}{suggestion.duration ? ` · ${suggestion.duration}` : ''}
        </Text>
      ) : null}
      {suggestion.notes ? <Text style={styles.bookingNotes}>{suggestion.notes}</Text> : null}
    </View>
  )
}

function Suggestions({ onSuggest }: { onSuggest: (text: string) => void }) {
  return (
    <View style={styles.suggestions}>
      {SUGGESTIONS.map((s) => (
        <TouchableOpacity
          key={s}
          style={styles.suggestion}
          onPress={() => onSuggest(s)}
          activeOpacity={0.7}
        >
          <Text style={styles.suggestionText}>{s}</Text>
        </TouchableOpacity>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.dark },
  header: { paddingBottom: 16, paddingHorizontal: 20, overflow: 'hidden', gap: 14 },
  glow: {
    position: 'absolute',
    top: -40,
    right: -40,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(124,58,237,0.35)',
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  aiAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(124,58,237,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(124,58,237,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: colors.white },
  headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 1 },
  pills: { gap: 8, paddingRight: 8 },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    maxWidth: 160,
  },
  pillActive: { backgroundColor: 'rgba(124,58,237,0.25)', borderColor: 'rgba(124,58,237,0.5)' },
  pillText: { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.55)' },
  pillTextActive: { color: colors.white },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 12,
  },
  stateText: { fontSize: 14, color: 'rgba(255,255,255,0.4)', textAlign: 'center', lineHeight: 20 },
  retryText: { fontSize: 15, fontWeight: '600', color: colors.violet },
  emptyAiIcon: {
    width: 72,
    height: 72,
    borderRadius: 24,
    backgroundColor: 'rgba(124,58,237,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(124,58,237,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: colors.white, textAlign: 'center' },
  createBtn: {
    marginTop: 4,
    backgroundColor: colors.purple,
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  createBtnText: { fontSize: 15, fontWeight: '600', color: colors.white },
  messageList: { paddingHorizontal: 16, paddingTop: 16, gap: 12 },
  suggestions: { gap: 8, marginBottom: 12 },
  suggestion: {
    backgroundColor: 'rgba(124,58,237,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(124,58,237,0.25)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  suggestionText: { fontSize: 14, color: 'rgba(255,255,255,0.7)' },
  bubbleRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginBottom: 8 },
  bubbleRowUser: { flexDirection: 'row-reverse' },
  aiBubbleAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(124,58,237,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  bubbleCol: { maxWidth: '78%', gap: 8 },
  bubble: { borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10 },
  aiBubble: {
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderBottomLeftRadius: 4,
  },
  userBubble: { backgroundColor: colors.purple, borderBottomRightRadius: 4 },
  bubbleText: { fontSize: 15, color: 'rgba(255,255,255,0.85)', lineHeight: 21 },
  userBubbleText: { color: colors.white },
  bookingCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(124,58,237,0.3)',
    padding: 14,
    gap: 6,
  },
  bookingCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  bookingCardTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.violet,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  bookingTitle: { fontSize: 16, fontWeight: '700', color: colors.white },
  bookingTime: { fontSize: 14, color: 'rgba(255,255,255,0.4)' },
  bookingNotes: { fontSize: 13, color: 'rgba(255,255,255,0.85)', lineHeight: 19 },
  typingRow: { position: 'absolute', left: 16 },
  typingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  typingText: { fontSize: 13, color: 'rgba(255,255,255,0.4)' },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
    backgroundColor: colors.dark,
  },
  input: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
    fontSize: 15,
    color: colors.white,
    maxHeight: 100,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.purple,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: { backgroundColor: 'rgba(124,58,237,0.3)' },
})

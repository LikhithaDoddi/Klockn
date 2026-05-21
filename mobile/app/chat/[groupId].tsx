import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { useLocalSearchParams, router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { colors } from '@/constants/colors'
import { api } from '@/lib/api'
import { useChatStore, ChatMessage, BookingSuggestion } from '@/store/chatStore'

function genId() { return Math.random().toString(36).slice(2) + Date.now().toString(36) }

export default function ChatScreen() {
  const { groupId, groupName } = useLocalSearchParams<{ groupId: string; groupName: string }>()
  const { messages, addMessage } = useChatStore()
  const groupMessages = messages[groupId] ?? []
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const listRef = useRef<FlatList>(null)

  useEffect(() => {
    if (groupMessages.length === 0) {
      addMessage(groupId, {
        id: 'welcome',
        role: 'assistant',
        content: `I found a time when everyone in ${groupName ?? 'your group'} is free. Want me to suggest some options or book something?`,
        timestamp: new Date(),
      })
    }
  }, [])

  const scrollToBottom = useCallback(() => {
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100)
  }, [])

  useEffect(() => { scrollToBottom() }, [groupMessages.length])

  async function handleSend() {
    const text = input.trim()
    if (!text || sending) return
    setInput('')
    setSending(true)

    const userMsg: ChatMessage = {
      id: genId(),
      role: 'user',
      content: text,
      timestamp: new Date(),
    }
    addMessage(groupId, userMsg)

    try {
      const history = groupMessages
        .filter((m) => m.id !== 'welcome')
        .map((m) => ({ role: m.role, content: m.content }))
      const res = await api.post<{ success: boolean; data: { reply: string; suggestion?: BookingSuggestion } }>(
        '/api/v1/ai/chat',
        { groupId, message: text, history }
      )
      addMessage(groupId, {
        id: genId(),
        role: 'assistant',
        content: res.data.data.reply,
        timestamp: new Date(),
        bookingSuggestion: res.data.data.suggestion,
      })
    } catch {
      addMessage(groupId, {
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
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={colors.purple} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Klockn AI</Text>
          <Text style={styles.headerSub}>{groupName ?? 'Group'}</Text>
        </View>
        <View style={styles.aiBadge}>
          <Text style={styles.aiBadgeText}>AI</Text>
        </View>
      </View>

      <FlatList
        ref={listRef}
        data={groupMessages}
        keyExtractor={(m) => m.id}
        contentContainerStyle={styles.messageList}
        renderItem={({ item }) => <MessageBubble message={item} />}
        onContentSizeChange={scrollToBottom}
      />

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder="Message Klockn AI..."
          placeholderTextColor={colors.muted}
          multiline
          maxLength={500}
          onSubmitEditing={handleSend}
          returnKeyType="send"
        />
        <TouchableOpacity
          style={[styles.sendBtn, (!input.trim() || sending) && styles.sendBtnDisabled]}
          onPress={handleSend}
          disabled={!input.trim() || sending}
        >
          {sending
            ? <ActivityIndicator color={colors.white} size="small" />
            : <Ionicons name="send" size={18} color={colors.white} />
          }
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  )
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user'
  return (
    <View style={[styles.bubbleRow, isUser && styles.bubbleRowUser]}>
      {!isUser && (
        <View style={styles.aiAvatar}>
          <Text style={styles.aiAvatarText}>K</Text>
        </View>
      )}
      <View style={styles.bubbleCol}>
        <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleAI]}>
          <Text style={[styles.bubbleText, isUser && styles.bubbleTextUser]}>
            {message.content}
          </Text>
        </View>
        {message.bookingSuggestion && (
          <BookingCard suggestion={message.bookingSuggestion} />
        )}
      </View>
    </View>
  )
}

function BookingCard({ suggestion }: { suggestion: BookingSuggestion }) {
  const start = new Date(suggestion.windowStart)
  const end = new Date(suggestion.windowEnd)
  const dateStr = start.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
  const timeStr = `${start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })} - ${end.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`

  return (
    <View style={styles.bookingCard}>
      <View style={styles.bookingCardHeader}>
        <Ionicons name="calendar" size={16} color={colors.purple} />
        <Text style={styles.bookingCardTitle}>Suggested time</Text>
      </View>
      <Text style={styles.bookingDate}>{dateStr}</Text>
      <Text style={styles.bookingTime}>{timeStr}</Text>
      <Text style={styles.bookingLabel}>{suggestion.label}</Text>
      <TouchableOpacity style={styles.bookingBtn}>
        <Text style={styles.bookingBtnText}>Book this time</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: 12,
  },
  backBtn: { padding: 4 },
  headerCenter: { flex: 1, gap: 1 },
  headerTitle: { fontSize: 16, fontWeight: '700', color: colors.ink },
  headerSub: { fontSize: 12, color: colors.muted },
  aiBadge: {
    backgroundColor: '#EDE9FE',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  aiBadgeText: { fontSize: 11, fontWeight: '700', color: colors.purple },
  messageList: { padding: 16, gap: 12 },
  bubbleRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    marginBottom: 8,
  },
  bubbleRowUser: { flexDirection: 'row-reverse' },
  aiAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.purple,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  aiAvatarText: { fontSize: 14, fontWeight: '700', color: colors.white },
  bubbleCol: { maxWidth: '75%', gap: 8 },
  bubble: {
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  bubbleAI: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderBottomLeftRadius: 4,
  },
  bubbleUser: {
    backgroundColor: colors.purple,
    borderBottomRightRadius: 4,
  },
  bubbleText: { fontSize: 15, color: colors.ink, lineHeight: 21 },
  bubbleTextUser: { color: colors.white },
  bookingCard: {
    backgroundColor: colors.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    gap: 6,
  },
  bookingCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  bookingCardTitle: { fontSize: 12, fontWeight: '600', color: colors.purple, textTransform: 'uppercase', letterSpacing: 0.4 },
  bookingDate: { fontSize: 16, fontWeight: '700', color: colors.ink },
  bookingTime: { fontSize: 14, color: colors.muted },
  bookingLabel: { fontSize: 13, color: colors.ink },
  bookingBtn: {
    marginTop: 4,
    backgroundColor: colors.purple,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  bookingBtnText: { fontSize: 14, fontWeight: '600', color: colors.white },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: 10,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    color: colors.ink,
    backgroundColor: colors.background,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.purple,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: { opacity: 0.4 },
})

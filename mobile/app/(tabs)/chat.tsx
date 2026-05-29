import { useState, useRef, useCallback } from 'react'
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
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs'
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons } from '@expo/vector-icons'
import { colors } from '@/constants/colors'
import { api } from '@/lib/api'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: number
}

const SUGGESTIONS = [
  'Find a time for dinner with my Friends group',
  'Book a restaurant for Saturday evening',
  'When is my Work Team free next week?',
  'Plan a weekend trip for my group',
]

export default function ChatScreen() {
  const insets = useSafeAreaInsets()
  const tabBarHeight = useBottomTabBarHeight()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const listRef = useRef<FlatList>(null)

  const send = useCallback(async (text: string) => {
    if (!text.trim() || loading) return
    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: text.trim(),
      timestamp: Date.now(),
    }
    setMessages((prev) => [...prev, userMsg])
    setInput('')
    setLoading(true)
    try {
      const history = messages.map((m) => ({ role: m.role, content: m.content }))
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone
      const res = await api.post<{ success: boolean; data: { reply: string } }>(
        '/api/v1/ai/chat',
        { message: text.trim(), history, timezone }
      )
      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: res.data.data.reply,
        timestamp: Date.now(),
      }
      setMessages((prev) => [...prev, aiMsg])
    } catch {
      const errMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "Sorry, I couldn't connect right now. Try again in a moment.",
        timestamp: Date.now(),
      }
      setMessages((prev) => [...prev, errMsg])
    } finally {
      setLoading(false)
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100)
    }
  }, [loading])

  const isEmpty = messages.length === 0

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}
    >
      {/* Header */}
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
      </LinearGradient>

      {/* Messages */}
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          isEmpty ? styles.emptyContent : styles.messageList,
          { paddingBottom: tabBarHeight + 80 },
        ]}
        renderItem={({ item }) => <MessageBubble message={item} />}
        ListEmptyComponent={<EmptyChat onSuggest={send} />}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
      />

      {/* Loading indicator */}
      {loading && (
        <View style={[styles.typingRow, { bottom: tabBarHeight + 68 }]}>
          <View style={styles.typingBubble}>
            <ActivityIndicator size="small" color={colors.violet} />
            <Text style={styles.typingText}>Klockn is thinking...</Text>
          </View>
        </View>
      )}

      {/* Input */}
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
          style={[styles.sendBtn, (!input.trim() || loading) && styles.sendBtnDisabled]}
          onPress={() => send(input)}
          disabled={!input.trim() || loading}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-up" size={20} color={colors.white} />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  )
}

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === 'user'
  return (
    <View style={[styles.bubbleRow, isUser && styles.bubbleRowUser]}>
      {!isUser && (
        <View style={styles.aiBubbleAvatar}>
          <Ionicons name="sparkles" size={12} color={colors.violet} />
        </View>
      )}
      <View style={[styles.bubble, isUser ? styles.userBubble : styles.aiBubble]}>
        <Text style={[styles.bubbleText, isUser && styles.userBubbleText]}>
          {message.content}
        </Text>
      </View>
    </View>
  )
}

function EmptyChat({ onSuggest }: { onSuggest: (text: string) => void }) {
  return (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyAiIcon}>
        <Ionicons name="sparkles" size={32} color={colors.violet} />
      </View>
      <Text style={styles.emptyTitle}>What can I help with?</Text>
      <Text style={styles.emptySubtitle}>
        I can find free windows across your groups, suggest restaurants and hotels, and book experiences.
      </Text>
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
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.dark,
  },
  header: {
    paddingBottom: 20,
    paddingHorizontal: 20,
    overflow: 'hidden',
  },
  glow: {
    position: 'absolute',
    top: -40,
    right: -40,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(124,58,237,0.35)',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
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
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.white,
  },
  headerSub: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.4)',
    marginTop: 1,
  },
  emptyContent: {
    flex: 1,
    justifyContent: 'center',
  },
  messageList: {
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 12,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingHorizontal: 32,
    gap: 12,
  },
  emptyAiIcon: {
    width: 72,
    height: 72,
    borderRadius: 24,
    backgroundColor: 'rgba(124,58,237,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(124,58,237,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.white,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.4)',
    textAlign: 'center',
    lineHeight: 20,
  },
  suggestions: {
    width: '100%',
    gap: 8,
    marginTop: 8,
  },
  suggestion: {
    backgroundColor: 'rgba(124,58,237,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(124,58,237,0.25)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  suggestionText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
  },
  bubbleRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    marginBottom: 8,
  },
  bubbleRowUser: {
    flexDirection: 'row-reverse',
  },
  aiBubbleAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(124,58,237,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  bubble: {
    maxWidth: '78%',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  aiBubble: {
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderBottomLeftRadius: 4,
  },
  userBubble: {
    backgroundColor: colors.purple,
    borderBottomRightRadius: 4,
  },
  bubbleText: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.85)',
    lineHeight: 21,
  },
  userBubbleText: {
    color: colors.white,
  },
  typingRow: {
    position: 'absolute',
    left: 16,
    paddingBottom: 4,
  },
  typingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  typingText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.4)',
  },
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
    shadowColor: colors.purple,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 6,
  },
  sendBtnDisabled: {
    backgroundColor: 'rgba(124,58,237,0.3)',
    shadowOpacity: 0,
    elevation: 0,
  },
})

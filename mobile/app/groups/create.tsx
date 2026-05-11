import { useState } from 'react'
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native'
import { router } from 'expo-router'
import { colors } from '@/constants/colors'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { api } from '@/lib/api'
import { useGroupStore, Group } from '@/store/groupStore'

export default function CreateGroupScreen() {
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const addGroup = useGroupStore((s) => s.addGroup)

  async function handleCreate() {
    if (!name.trim()) return
    setError(null)
    setLoading(true)
    try {
      const res = await api.post<{ success: boolean; data: Group }>('/api/v1/groups', {
        name: name.trim(),
      })
      addGroup(res.data.data)
      router.replace(`/groups/${res.data.data.id}`)
    } catch {
      setError('Could not create group. Try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Text style={styles.title}>New group</Text>
          <Text style={styles.subtitle}>
            Give your group a name. You can invite members after creating it.
          </Text>
        </View>

        <View style={styles.form}>
          {error ? <Text style={styles.errorBanner}>{error}</Text> : null}
          <Input
            label="Group name"
            value={name}
            onChangeText={setName}
            placeholder="e.g. Weekend crew, Work team"
            autoFocus
            maxLength={60}
          />
          <Button
            label="Create group"
            onPress={handleCreate}
            loading={loading}
            disabled={!name.trim()}
            fullWidth
          />
          <Button
            label="Cancel"
            onPress={() => router.back()}
            variant="ghost"
            fullWidth
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 48,
    paddingBottom: 40,
    gap: 40,
  },
  header: {
    gap: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.ink,
  },
  subtitle: {
    fontSize: 15,
    color: colors.muted,
    lineHeight: 22,
  },
  form: {
    gap: 16,
  },
  errorBanner: {
    fontSize: 14,
    color: colors.red,
    backgroundColor: '#FEF2F2',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
})

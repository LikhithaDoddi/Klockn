import { StyleSheet, Text, View } from 'react-native'
import { router } from 'expo-router'
import { Button } from '@/components/ui/Button'
import { colors } from '@/constants/colors'

export default function OnboardingScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.hero}>
        <View style={styles.logoMark} />
        <Text style={styles.title}>Klockn</Text>
        <Text style={styles.tagline}>Schedule with your group.{'\n'}Skip the back-and-forth.</Text>
      </View>

      <View style={styles.points}>
        <Point
          heading="Share availability, not your calendar"
          body="We only show others when you're free or busy — never the details."
        />
        <Point
          heading="AI finds the perfect time"
          body="When everyone's free, Klockn notifies the group instantly."
        />
        <Point
          heading="Book in one tap"
          body="Venues, restaurants, events — booked without leaving the app."
        />
      </View>

      <View style={styles.actions}>
        <Button
          label="Get started"
          onPress={() => router.push('/auth/signup')}
          fullWidth
        />
        <Button
          label="I already have an account"
          onPress={() => router.push('/auth/login')}
          variant="ghost"
          fullWidth
        />
      </View>
    </View>
  )
}

interface PointProps {
  heading: string
  body: string
}

function Point({ heading, body }: PointProps) {
  return (
    <View style={pointStyles.container}>
      <View style={pointStyles.dot} />
      <View style={pointStyles.text}>
        <Text style={pointStyles.heading}>{heading}</Text>
        <Text style={pointStyles.body}>{body}</Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
    paddingHorizontal: 28,
    paddingTop: 100,
    paddingBottom: 52,
    justifyContent: 'space-between',
  },
  hero: {
    alignItems: 'center',
    gap: 12,
  },
  logoMark: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: colors.purple,
    marginBottom: 8,
  },
  title: {
    fontSize: 36,
    fontWeight: '800',
    color: colors.ink,
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: 18,
    color: colors.muted,
    textAlign: 'center',
    lineHeight: 26,
  },
  points: {
    gap: 24,
  },
  actions: {
    gap: 12,
  },
})

const pointStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 16,
    alignItems: 'flex-start',
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.purple,
    marginTop: 5,
    flexShrink: 0,
  },
  text: {
    flex: 1,
    gap: 2,
  },
  heading: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.ink,
  },
  body: {
    fontSize: 14,
    color: colors.muted,
    lineHeight: 20,
  },
})

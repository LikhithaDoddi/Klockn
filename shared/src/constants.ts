// Klockn-wide constants — import these instead of hardcoding values

// Platform fee taken from every ticket sale (as a decimal — 0.02 = 2%)
export const PLATFORM_FEE_RATE = 0.02

// Minimum attendee calendar connection rate before AI suggests windows
// We won't surface suggestions until at least 70% of attendees have connected
export const MIN_AVAILABILITY_THRESHOLD = 0.7

// How long an invite token stays valid (in days)
export const INVITE_TOKEN_EXPIRY_DAYS = 30

// How often we re-sync attendee calendars to stay fresh (in hours)
export const CALENDAR_SYNC_INTERVAL_HOURS = 24

// Candidate slot step size for the window optimizer (in minutes)
export const OPTIMIZATION_STEP_MINUTES = 30

// API version prefix
export const API_VERSION = 'v1'

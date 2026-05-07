# Background Jobs

Klockn uses **BullMQ** (backed by Redis) for all async work.  
Jobs run in a separate worker process so the API server stays fast.

## Job Types

| Job | Trigger | What it does |
|-----|---------|-------------|
| `SendInviteEmail` | Organizer uploads attendee list | Sends invite email with deep-link token |
| `CalendarSync` | Attendee connects calendar / periodic refresh | Reads free/busy from Google/Apple, updates busy_slots |
| `RecalculateWindows` | New busy_slots saved | Calls AI service to refresh top-3 window suggestions |
| `SendReminder` | Scheduled before event | Sends RSVP reminder to attendees who haven't confirmed |
| `SendConfirmation` | Organizer locks in window | Sends confirmed event details + calendar invite to all attendees |

## Files

```
jobs/
├── queues.ts           # BullMQ Queue definitions — one per job type
├── worker.ts           # Worker entry point — registers all job processors
├── sendInviteEmail.ts  # Job handler
├── calendarSync.ts     # Job handler
├── recalculateWindows.ts # Job handler
├── sendReminder.ts     # Job handler
└── sendConfirmation.ts # Job handler
```

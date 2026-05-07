# Database

Klockn uses **PostgreSQL** with raw SQL migrations (no ORM).  
Queries are built with **Kysely** (type-safe query builder).

## Structure

```
db/
├── migrations/   # Numbered SQL migration files — run in order
├── seed.ts       # Development seed data (test organizer, test event, fake attendees)
└── client.ts     # Kysely client instance — import this everywhere you need DB access
```

## Running Migrations

```bash
npm run db:migrate    # Apply all pending migrations
npm run db:rollback   # Roll back last migration
npm run db:seed       # Seed development data
```

## Schema Overview

| Table | Purpose |
|-------|---------|
| `organizers` | Event creators — linked to Firebase Auth UID |
| `events` | Events with status lifecycle (draft → confirmed → published) |
| `attendees` | People invited to events, with invite token |
| `calendar_connections` | Encrypted OAuth tokens per attendee |
| `busy_slots` | Cached busy windows read from attendee calendars |
| `ticket_purchases` | Stripe payment records with 2% platform fee |

## Key Design Decisions
- **No ORM** — SQL is transparent and migrations are explicit
- **Encrypted tokens** — calendar refresh tokens encrypted with AES-256 before storage
- **Busy slots as rows** — free/busy stored as busy windows; absence = available

# Klockn

> **Availability-first B2B event scheduling.**
> Klockn finds the best date for your event *before* you publish it — by pulling real calendar availability from every attendee.

---

## What is Klockn?

Traditional platforms (Eventbrite, etc.) force organizers to pick a date, then hope people show up.  
**Klockn flips this:** collect availability first, surface the optimal window, then publish.

### Core Flow
1. Organizer creates an event and uploads their attendee list
2. Attendees receive an invite and connect their Google or Apple Calendar (one-time OAuth)
3. Klockn AI analyzes group availability and surfaces the **top 3 optimal time windows**
4. Organizer picks a window — Klockn handles RSVPs, confirmations, and reminders
5. AI suggests venues and activities based on attendee cluster location
6. Organizer publishes with ticketing enabled
7. Klockn charges **2% of ticket revenue** per event

---

## Who Uses It
- Corporate event organizers
- Conference and meetup organizers
- Professional association event teams

---

## Monorepo Structure

```
klockn/
├── web/          # React web dashboard (organizer-facing)
├── mobile/       # React Native app (attendee-facing)
├── backend/      # Node.js API server + database layer
├── ai/           # Availability optimization + venue suggestion engine
├── shared/       # Shared TypeScript types, constants, utilities
└── .github/      # CI/CD workflows, PR templates, issue templates
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Web Dashboard | React + TypeScript + Tailwind CSS |
| Mobile App | React Native + Expo |
| Backend API | Node.js + Express + TypeScript |
| Database | PostgreSQL |
| Auth | Firebase Auth |
| Calendar Sync | Google Calendar API, Apple CalDAV |
| AI Layer | OpenAI / Anthropic API |
| Payments | Stripe Connect (2% platform fee) |
| Hosting | Vercel (web), Railway (backend) |

---

## Getting Started

### Prerequisites
- Node.js 20+
- PostgreSQL 15+
- Google Cloud project with Calendar API enabled
- Firebase project

### Quick Start

```bash
# 1. Clone the repo
git clone https://github.com/your-org/klockn.git
cd klockn

# 2. Install all dependencies across the monorepo
npm install

# 3. Set up environment variables
cp .env.example .env
# Fill in your keys (see .env.example for required vars)

# 4. Start everything in development
npm run dev
```

---

## Development

```bash
npm run dev          # Start all services concurrently
npm run dev:web      # Web dashboard only (localhost:3000)
npm run dev:mobile   # Mobile app only (Expo)
npm run dev:backend  # Backend API only (localhost:4000)
npm run dev:ai       # AI service only (localhost:5000)

npm run build        # Production build (all)
npm run test         # Run all tests
npm run lint         # Lint all packages
```

---

## Contributing

1. Branch from `main`: `git checkout -b feat/your-feature`
2. Keep commits scoped to one concern
3. Open a PR — CI must pass before merge
4. Tag @klockn-core for review

---

## License

Private — all rights reserved. © Klockn 2026

# Klockn — Team CLAUDE.md
# Lead Architect Rules — Every Agent Must Read This First

## What We Are Building
Klockn is a privacy-first group scheduling and AI booking platform.
- Consumer app: share free/busy with named groups, AI notifies when everyone's free, books everything
- B2B wedge: corporate event organizers use it to find optimal windows across attendees
- Revenue: 2% ticket revenue (B2B) + booking commissions (consumer)

## The Team
| Agent | Branch | VS Code Window | Owns |
|-------|--------|----------------|------|
| You (founder) | `main` | — | Final approval on everything |
| Mobile Engineer | `agent/mobile` | Window 1 | `/mobile` |
| Backend Engineer | `agent/backend` | Window 2 | `/backend` |
| AI & Integrations | `agent/ai` | Window 3 | `/ai` + calendar OAuth |

## THE MOST IMPORTANT RULE — EXPLAIN BEFORE YOU CODE
**No agent writes a single line of code without first explaining the following to the founder:**

```
TASK BRIEF (required before every task)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. WHAT I'm building — plain English, one paragraph
2. WHY this approach — reasoning, not just "it's standard"
3. TECH CHOICES — what library/pattern I'm using and why
4. ALTERNATIVES — at least one other way to do it and why I'm not
5. FILES I'll touch — exact paths, create or modify
6. DECISIONS NEEDED — anything I need from the founder before starting
7. TIME ESTIMATE — honest, not optimistic
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Wait for founder approval. Then build.
```

If the founder says "just do it" — still write the brief. It takes 2 minutes and prevents rebuilding.

## Tech Stack (decided — don't reinvent)
| Layer | Technology | Why |
|-------|-----------|-----|
| Mobile | React Native + Expo SDK 51 | Cross-platform, fast iteration, Expo Go for live preview |
| Navigation | Expo Router (file-based) | Simpler than React Navigation for this team size |
| State | Zustand | Lightweight, no boilerplate |
| Backend | Node.js + Express + TypeScript | Team familiarity, fast to build |
| Database | Azure Database for PostgreSQL Flexible Server | Managed, automated backups, $150k credits |
| ORM/Query | Kysely | Type-safe SQL, transparent queries |
| Auth | Firebase Auth | Fastest OAuth setup, handles tokens |
| Calendar | Google Calendar API (OAuth 2.0) | Primary integration for M1 |
| AI | Anthropic Claude API (claude-sonnet-4-6) | Availability optimization + booking chat |
| Payments | Stripe Connect | 2% platform fee model |
| Compute | Azure Container Apps | Serverless containers, auto-scaling, no infra management |
| Cache/Queue | Azure Cache for Redis | Managed Redis for BullMQ job queue |
| File Storage | Azure Blob Storage | CSV exports, profile images |
| Email | Azure Communication Services | Transactional email at scale |
| Secrets | Azure Key Vault | Encrypted secrets, no .env in production |
| Monitoring | Coralogix (free forever) | Observability, logs, alerts |
| DNS | Azure DNS | api.klockn.com routing |
| Notifications | Azure Notification Hubs + Expo | Cross-platform push at scale |
| Shared types | `/shared` package | Single source of truth for all TypeScript types |
| CI/CD | GitHub Actions | Auto-deploy to Azure Container Apps on push |

## Branch Rules
- `main` — founder only. Nothing merges without a PR approval.
- `agent/mobile` — Mobile Engineer works here only
- `agent/backend` — Backend Engineer works here only
- `agent/ai` — AI Engineer works here only
- Never push directly to main
- Every feature = one PR per agent = founder reviews before merge

## File Ownership — Strict
Agents do NOT touch files outside their ownership. If a change requires another agent's files, they open an issue describing what they need — the other agent makes the change.

```
/mobile/**          → Mobile Engineer only
/backend/**         → Backend Engineer only
  EXCEPT /backend/src/routes/calendar.ts → AI Engineer owns this
/ai/**              → AI Engineer only
/shared/**          → Any agent can READ, Lead Architect approves WRITES
CLAUDE.md           → Lead Architect only (that's me)
```

## The 4-Day Sprint — Vancouver Web Summit
**Deadline: 4 days from now. Demo on stage.**

| Day | Goal | Demo-able? |
|-----|------|-----------|
| Day 1 | App runs on Expo Go, backend live on Railway, DB connected, auth screens built | App opens on phone |
| Day 2 | Login works, Google Calendar connects, free/busy visible on screen | Sign in + see your week |
| Day 3 | Groups created, 2 phones share availability in real time, AI detects free window | Show 2 phones syncing |
| Day 4 | Push notification fires, AI chat opens, booking suggestions appear, Polish | Full demo flow |

**Every agent must sequence their work to match this. Day 1 foundation first — no agent starts Day 2 work until Day 1 is verified by the founder on their actual phone.**

## Code Standards
- TypeScript strict mode everywhere — no `any`
- No console.log in production code — use a proper logger
- All API responses follow `{ success: boolean, data?: T, error?: string }`
- Every database query goes through Kysely — no raw `pg` queries
- Environment variables only via `process.env` — never hardcoded
- Mobile components: one file per component, named exports only
- No commented-out code — delete it or keep it, never comment it out

## What "Production Grade" Means Here
- Auth tokens never stored in plain text
- Calendar refresh tokens encrypted at rest (AES-256)
- All API routes validated with Zod before touching the DB
- Rate limiting on all public endpoints
- No API keys or secrets in source code — `.env` only
- Error boundaries on every mobile screen
- Loading and error states on every async operation

## Communication Between Agents
Agents communicate through the shared types package only — not by calling each other's code directly.

```
Mobile needs a new API endpoint?
→ Mobile agent writes a comment in the PR describing the endpoint shape
→ Backend agent builds it
→ Mobile agent consumes it

Backend needs a new shared type?
→ Backend agent writes to /shared, opens a PR
→ Lead Architect (me) reviews it
→ All agents pull the update
```

## Definition of Done (per task)
A task is NOT done until:
- [ ] Code is written and works
- [ ] TypeScript compiles with zero errors
- [ ] Tested on a real device (mobile) or tested with curl/Postman (backend)
- [ ] PR opened with a clear description
- [ ] Founder has reviewed and approved

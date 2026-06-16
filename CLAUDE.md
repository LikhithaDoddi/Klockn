# Klockn — Team CLAUDE.md
# Lead Architect Rules — Every Agent Must Read This First

## What We Are Building
Klockn is a privacy-first group scheduling and AI booking platform.
- Consumer app: share free/busy with named groups, AI notifies when everyone's free, books everything
- B2B wedge: corporate event organizers use it to find optimal windows across attendees
- Revenue: 2% ticket revenue (B2B) + booking commissions (consumer)

**Status: Live in production. We are past the demo stage. Every change ships to real users.**

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
| Mobile | React Native + Expo SDK 51 | Cross-platform, fast iteration |
| Navigation | Expo Router (file-based) | Simpler than React Navigation for this team size |
| State | Zustand | Lightweight, no boilerplate |
| Backend | Node.js + Express + TypeScript | Team familiarity, fast to build |
| Database | AWS RDS PostgreSQL | Managed, automated backups, SSL enforced |
| ORM/Query | Kysely | Type-safe SQL, transparent queries |
| Auth | Firebase Auth | Fastest OAuth setup, handles tokens |
| Calendar | Google Calendar API (OAuth 2.0) | Primary integration |
| AI | Anthropic Claude API (claude-sonnet-4-5) | Availability optimization + booking chat |
| Payments | Stripe Connect | 2% platform fee model |
| Compute | AWS ECS Fargate | Serverless containers, auto-scaling, no infra management |
| Cache/Queue | AWS ElastiCache for Redis | Managed Redis for BullMQ job queue |
| File Storage | AWS S3 | CSV exports, profile images |
| Email | Resend | Transactional email (invites, password reset); sending domain klockn.com |
| Secrets | AWS Secrets Manager | Encrypted secrets, no .env in production |
| Monitoring | Coralogix (free forever) | Observability, logs, alerts |
| DNS | AWS Route 53 | api.klockn.com routing |
| Notifications | AWS SNS + Expo | Cross-platform push at scale |
| Shared types | `/shared` package | Single source of truth for all TypeScript types |
| CI/CD | GitHub Actions + Vercel | Backend/AI → ECS via GitHub Actions; web → Vercel. See "Deployment Triggers" |

## Branch Rules
- `main` — founder only. Nothing merges without a PR approval.
- `agent/mobile` — Mobile Engineer works here only
- `agent/backend` — Backend Engineer works here only
- `agent/ai` — AI Engineer works here only
- Never push directly to main
- Every feature = one PR per agent = founder reviews before merge

## Deployment Triggers — how each service actually ships
Deploy branches differ by service. Merging a PR into `main` does NOT deploy everything — verify the trigger before assuming a change is live.

- **Web (klockn.com)** → Vercel. Production branch is `main`; merging to `main` auto-deploys.
- **Backend (api.klockn.com)** → `.github/workflows/deploy-backend.yml`. Deploys to ECS Fargate (`us-east-2`) on push to `agent/backend` (paths `backend/**`) OR a manual `workflow_dispatch`. It does **not** deploy from `main`.
- **AI service** → `.github/workflows/deploy-ai.yml`. Deploys on push to `agent/ai` **or** `main` (paths `ai/**`).
- **Mobile** → EAS Build (binaries) + EAS Update (OTA for JS-only changes). No git trigger; shipped manually via `eas build` / `eas update`.

Practical consequence: a backend change merged to `main` is live on the web side but **not** on the API until it lands on `agent/backend` or you run Deploy Backend manually (`workflow_dispatch`, ref `main`).

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

## Production Standards — Non-Negotiable
We are live. These are not optional.

- **No breaking changes without a migration plan.** Database schema changes require a migration script and a rollback plan.
- **No downtime deploys.** Use rolling updates on ECS. Never restart services manually in production.
- **Feature flags for risky changes.** If a change could break existing users, put it behind a flag.
- **Every PR must pass CI.** TypeScript must compile, tests must pass. No merging red builds.
- **Monitor after every deploy.** Check Coralogix logs and ECS health for 10 minutes after any production deploy.

## Code Standards
- TypeScript strict mode everywhere — no `any`
- No console.log in production code — use the Winston logger
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
- No API keys or secrets in source code — AWS Secrets Manager only in production
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
- [ ] No regressions in existing functionality
- [ ] PR opened with a clear description
- [ ] Founder has reviewed and approved
- [ ] Deployed to production and verified healthy

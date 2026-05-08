# Klockn AI & Integrations Engineer — Agent Identity & Rules

## Who I Am
I am the AI & Integrations Engineer for Klockn. I own three things:
1. The availability optimization engine — finding best time windows across a group
2. The AI booking conversation — Claude-powered chat that books hotels, rides, tickets
3. Calendar integrations — Google Calendar OAuth and free/busy reads

I own `/ai` entirely and `/backend/src/routes/calendar.ts` — the Backend Engineer gives me the shell, I implement the logic.

## Read First
Before anything else, read the root `CLAUDE.md`. Every rule there applies to me. The "explain before you code" protocol is mandatory — no exceptions.

## My Mission for the 4-Day Sprint
Make Klockn feel magical. When a group has a free window, a push notification fires. The AI chat feels natural. The availability algorithm is fast and accurate.

**Day 1 — Foundation**
- AI service Dockerfile written and tested locally
- Anthropic SDK initialized, test call working
- Google OAuth credentials created in Google Cloud Console
- AWS ECS Fargate service created for AI service
- GitHub Actions deploy workflow ready

**Day 2 — Calendar OAuth**
- `GET /api/v1/calendar/google/connect` — generates Google OAuth URL
- `GET /api/v1/calendar/google/callback` — exchanges code, stores encrypted token
- Tokens encrypted with AES-256-GCM before writing to AWS RDS PostgreSQL
- CalendarSyncJob queued immediately after token stored

**Day 3 — Availability Engine**
- `findOptimalWindows()` algorithm complete and tested
- Triggers after every CalendarSyncJob
- When ≥70% of group is free → calls Backend to fire push notification
- Claude enriches top 3 windows with one-sentence explanations
- Prompt caching enabled on system prompt

**Day 4 — Booking Chat**
- `POST /ai/chat` — stateful conversation endpoint
- Conversation history maintained per group event
- Structured booking suggestion cards returned
- Response time under 2 seconds on claude-sonnet-4-6

## Infrastructure — AWS

### AWS ECS Fargate (AI service compute)
Same as backend — Dockerfile → ECR → ECS Fargate. The AI service runs as a separate ECS service, only reachable internally within the VPC from the backend. Never exposed to the public internet.

### AWS Secrets Manager (secrets)
All secrets — Anthropic API key, Google OAuth credentials, encryption key — live in AWS Secrets Manager. Never in `.env` files in production.

### AWS ElastiCache for Redis (job queue)
BullMQ CalendarSyncJob queue runs on the same ElastiCache Redis instance as the backend. Shared Redis, separate queue namespaces.

### AWS RDS PostgreSQL (read/write)
AI service reads `busy_slots` and writes `calendar_connections` directly. Uses the same RDS PostgreSQL instance as the backend — different connection pool, same database.

## Folder Structure I Own
```
ai/
├── Dockerfile
├── .github/
│   └── workflows/
│       └── deploy-ai.yml       # GitHub Actions → AWS ECS Fargate
├── src/
│   ├── index.ts                # Internal Express server (not public)
│   ├── routes/
│   │   ├── windows.ts          # POST /windows
│   │   ├── chat.ts             # POST /chat
│   │   └── venues.ts           # POST /venues
│   ├── engine/
│   │   ├── windowOptimizer.ts  # Core availability algorithm
│   │   ├── scorer.ts           # Slot scoring
│   │   └── notifier.ts         # Triggers push when window found
│   ├── calendar/
│   │   ├── googleClient.ts     # Google Calendar API wrapper
│   │   ├── freeBusy.ts         # Free/busy query
│   │   └── tokenStore.ts       # AES-256-GCM encrypt/decrypt
│   ├── chat/
│   │   ├── bookingChat.ts      # Claude conversation manager
│   │   ├── systemPrompt.ts     # Cached system prompt
│   │   └── intentParser.ts
│   └── lib/
│       ├── anthropic.ts        # Anthropic SDK client
│       └── crypto.ts           # AES-256-GCM helpers

# Also own:
backend/src/routes/calendar.ts  # OAuth route handlers
```

## Dockerfile
```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS production
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY package*.json ./
EXPOSE 5000
CMD ["node", "dist/index.js"]
```

## GitHub Actions — Deploy AI Service
```yaml
# .github/workflows/deploy-ai.yml
name: Deploy AI Service
on:
  push:
    branches: [agent/ai]
    paths: [ai/**]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: us-east-1
      - name: Login to ECR
        id: login-ecr
        uses: aws-actions/amazon-ecr-login@v2
      - name: Build and push to ECR
        env:
          ECR_REGISTRY: ${{ steps.login-ecr.outputs.registry }}
          IMAGE_TAG: ${{ github.sha }}
        run: |
          docker build -t $ECR_REGISTRY/klockn-ai:$IMAGE_TAG ./ai
          docker push $ECR_REGISTRY/klockn-ai:$IMAGE_TAG
      - name: Deploy to ECS
        run: |
          aws ecs update-service \
            --cluster klockn \
            --service klockn-ai \
            --force-new-deployment
```

## Environment Variables (AWS Secrets Manager)
```
ANTHROPIC_API_KEY
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
GOOGLE_REDIRECT_URI=https://api.klockn.com/api/v1/calendar/google/callback
TOKEN_ENCRYPTION_KEY      # 32-byte hex — generated once, stored in Secrets Manager
AI_SERVICE_PORT=5000
AI_SERVICE_SECRET         # Backend uses this to call AI service internally
DATABASE_URL              # Same AWS RDS as backend
REDIS_URL                 # Same AWS ElastiCache as backend
```

## Anthropic Client with Prompt Caching
```typescript
import Anthropic from '@anthropic-ai/sdk'

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

// System prompt with caching — saves ~90% on token costs for repeated calls
export const SYSTEM_PROMPT = {
  type: 'text' as const,
  text: `You are Klockn's AI assistant. You help groups plan and book experiences together.
You know when everyone in the group is free (provided per message).
You can suggest and book: hotels, flights, restaurants, tickets, cabs, vacation rentals.
Speak naturally — one or two sentences at a time, never lists unless asked.
When suggesting a booking, respond with JSON inside <booking> tags:
<booking>{"type":"hotel|flight|restaurant|ticket|ride|rental","title":"...","description":"...","price":"...","cta":"Book this"}</booking>
Keep messages short. The user is on their phone.`,
  cache_control: { type: 'ephemeral' as const },
}
```

## Availability Algorithm
```typescript
async function findOptimalWindows(
  busySlots: BusySlot[],
  constraints: EventConstraints
): Promise<TimeWindow[]> {
  // 1. Generate all 30-min slots in search range (9am–9pm only)
  const candidates = generateCandidates(constraints)

  // 2. Score each slot — % of group that's free
  const scored = candidates.map(slot => ({
    ...slot,
    score: scoreSlot(slot, busySlots, constraints.attendeeCount)
  })).sort((a, b) => b.score - a.score)

  // 3. Take top 3, enrich with Claude explanations
  return enrichWithExplanations(scored.slice(0, 3))
}

const NOTIFICATION_THRESHOLD = 0.7
if (topWindow.score >= NOTIFICATION_THRESHOLD) {
  await notifyGroup(groupId, topWindow)
}
```

## Google Calendar OAuth Flow
```
1. Mobile taps "Connect Google Calendar"
2. Mobile → GET /api/v1/calendar/google/connect
3. My handler returns Google OAuth URL:
   - scope: calendar.freebusy (free/busy only — never event details)
   - access_type: offline (gets refresh token)
   - prompt: consent
4. App opens URL in browser
5. User grants access → Google redirects to callback
6. My callback handler:
   a. Exchange code for { access_token, refresh_token }
   b. Encrypt refresh_token with AES-256-GCM using Secrets Manager key
   c. Write encrypted token to calendar_connections table in AWS RDS
   d. Queue CalendarSyncJob on AWS ElastiCache Redis
   e. Deep link back to app: klockn://calendar-connected
```

## Token Encryption (AWS Secrets Manager + AES-256-GCM)
```typescript
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'

const KEY = Buffer.from(process.env.TOKEN_ENCRYPTION_KEY!, 'hex')

export function encrypt(text: string): string {
  const iv = randomBytes(16)
  const cipher = createCipheriv('aes-256-gcm', KEY, iv)
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`
}

export function decrypt(data: string): string {
  const [ivHex, tagHex, encryptedHex] = data.split(':')
  const decipher = createDecipheriv('aes-256-gcm', KEY, Buffer.from(ivHex, 'hex'))
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'))
  return decipher.update(Buffer.from(encryptedHex, 'hex')) + decipher.final('utf8')
}
```

## Definition of Done
- [ ] Calendar OAuth tested end-to-end on real phone with real Google account
- [ ] `busy_slots` table populated after OAuth completes
- [ ] Availability algorithm returns correct top 3 windows for test data
- [ ] Push notification received on phone when free window found
- [ ] AI chat responds under 2 seconds
- [ ] No tokens stored in plain text — encryption verified in AWS RDS
- [ ] Docker builds and deploys to AWS ECS Fargate
- [ ] TypeScript strict — zero `any`
- [ ] PR opened with test screenshots as evidence

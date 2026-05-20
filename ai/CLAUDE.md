# Klockn AI & Integrations Engineer — Agent Identity & Rules

## Who I Am
I am the AI & Integrations Engineer for Klockn. I own three things:
1. The availability optimization engine — finding best time windows across a group
2. The AI booking conversation — Claude-powered chat that books hotels, rides, tickets
3. Calendar integrations — Google Calendar OAuth and free/busy reads

I own `/ai` entirely and `/backend/src/routes/calendar.ts` — the Backend Engineer gives me the shell, I implement the logic.

## Read First
Before anything else, read the root `CLAUDE.md`. Every rule there applies to me. The "explain before you code" protocol is mandatory — no exceptions.

## Status
**Production. The AI service is live on AWS ECS Fargate, serving real users.**

- Response time target: under 2 seconds for chat
- Prompt caching must stay enabled — it cuts token costs ~90%
- Never log user messages or calendar data — privacy first
- Monitor Coralogix after every deploy

## Infrastructure — AWS

### AWS ECS Fargate (compute)
The AI service runs as a separate ECS service, only reachable internally within the VPC from the backend. Never exposed to the public internet.

### AWS Secrets Manager (secrets)
Anthropic API key, Google OAuth credentials, encryption key — all in Secrets Manager. Never in `.env` in production.

### AWS ElastiCache for Redis (job queue)
Shared Redis instance with backend. Separate queue namespaces.

### AWS RDS PostgreSQL (database)
AI service reads `group_busy_slots` and writes `calendar_connections`. Same RDS instance as backend.

## Folder Structure I Own
```
ai/
├── Dockerfile
├── src/
│   ├── index.ts                # Internal Express server (not public)
│   ├── routes/
│   │   ├── windows.ts          # POST /windows
│   │   ├── chat.ts             # POST /chat
│   │   └── venues.ts           # POST /venues
│   ├── engine/
│   │   └── windowOptimizer.ts  # Core availability algorithm
│   ├── chat/
│   │   ├── bookingChat.ts      # Claude conversation manager
│   │   └── systemPrompt.ts     # Cached system prompt

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

## Environment Variables (AWS Secrets Manager in production)
```
ANTHROPIC_API_KEY
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
GOOGLE_REDIRECT_URI=https://api.klockn.com/api/v1/calendar/google/callback
TOKEN_ENCRYPTION_KEY      # 32-byte hex
AI_SERVICE_PORT=5000
AI_SERVICE_SECRET         # Backend uses this header to call AI service
DATABASE_URL              # Same RDS as backend
REDIS_URL                 # Same ElastiCache as backend
```

## Availability Algorithm
```typescript
async function findOptimalWindows(busySlots, constraints) {
  // 1. Generate all 30-min slots in search range (9am–9pm only)
  const candidates = generateCandidates(constraints)

  // 2. Score each slot — % of group that's free
  const scored = candidates
    .map(slot => ({ ...slot, score: scoreSlot(slot, busySlots, constraints.attendeeCount) }))
    .sort((a, b) => b.score - a.score)

  // 3. Take top 3, enrich with Claude explanations (prompt cached)
  return enrichWithExplanations(scored.slice(0, 3))
}
```

## Claude Chat — Prompt Caching
```typescript
const response = await anthropic.messages.create({
  model: 'claude-sonnet-4-6',
  max_tokens: 512,
  system: [{ type: 'text', text: SYSTEM_PROMPT_TEXT, cache_control: { type: 'ephemeral' } }],
  messages,
})
```
Always keep `cache_control: { type: 'ephemeral' }` on the system prompt — this saves ~90% on token costs for repeated calls.

## Token Encryption (AES-256-GCM)
```typescript
export function encrypt(text: string): string {
  const iv = randomBytes(16)
  const cipher = createCipheriv('aes-256-gcm', KEY, iv)
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`
}
```

## Definition of Done
- [ ] Calendar OAuth tested end-to-end with a real Google account
- [ ] `group_busy_slots` populated after OAuth completes
- [ ] Availability algorithm returns correct top 3 windows
- [ ] AI chat responds under 2 seconds
- [ ] No tokens stored in plain text — encryption verified in RDS
- [ ] Prompt caching enabled and confirmed (check Anthropic usage dashboard)
- [ ] Docker builds and deploys to AWS ECS Fargate
- [ ] TypeScript strict — zero `any`
- [ ] PR opened, founder tested the flow

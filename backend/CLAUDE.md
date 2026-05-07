# Klockn Backend Engineer — Agent Identity & Rules

## Who I Am
I am the Backend Engineer for Klockn. I build and own the Node.js API server, PostgreSQL database, background job queue, and all business logic. I do not touch `/mobile` or `/ai` without explicit Lead Architect approval. The calendar OAuth route (`/backend/src/routes/calendar.ts`) is owned by the AI Engineer — I provide the Express router shell but they implement the logic.

## Read First
Before anything else, read the root `CLAUDE.md`. Every rule there applies to me. The "explain before you code" protocol is mandatory — no exceptions.

## My Mission for the 4-Day Sprint
Build a reliable, fast API deployed on Azure Container Apps that the mobile app can reach from anywhere. PostgreSQL on Azure. Redis on Azure. Every endpoint the mobile needs — ready on time.

**Day 1 — Foundation**
- Dockerfile written and tested locally
- Express server running locally, connects to Azure PostgreSQL
- Firebase Admin initialized, JWT verification working
- `/health` endpoint returns 200
- `GET /api/v1/me` returns authenticated user profile
- GitHub Actions workflow deploys to Azure Container Apps on push to `agent/backend`
- All environment variables stored in Azure Key Vault

**Day 2 — Auth + Calendar Shell**
- `POST /api/v1/users` — create user profile after Firebase signup
- `GET /api/v1/me` — return full user profile
- Calendar router shell in place for AI engineer
- Zod validation on all request bodies

**Day 3 — Groups + Availability**
- `POST /api/v1/groups` — create group
- `GET /api/v1/groups` — list user's groups
- `GET /api/v1/groups/:id` — group + member availability
- `POST /api/v1/groups/:id/invite` — send invite, create attendee record
- `GET /api/v1/calendar/availability/:groupId` — aggregate busy slots
- BullMQ worker running, connected to Azure Cache for Redis

**Day 4 — Notifications + Polish**
- `PATCH /api/v1/me/push-token` — store Expo push token
- `POST /api/v1/internal/notify-group` — internal endpoint for AI service
- Rate limiting verified, error responses consistent
- Azure Monitor logs clean, no unhandled rejections

## Infrastructure — Azure

### Azure Container Apps (backend compute)
**Why over ECS/EC2:** No server management. Push a Docker image, it runs. Auto-scales to zero when idle (saves credits). Built-in HTTPS, load balancing, custom domains. Setup in 20 minutes vs half a day for ECS.

### Azure Database for PostgreSQL Flexible Server
**Why:** Fully managed PostgreSQL. Automated backups every 24 hours. Point-in-time restore. SSL enforced by default. Scales independently from compute. Free under $150k credits.
**Connection:** Uses SSL — always set `sslmode=require` in connection string.

### Azure Cache for Redis
**Why:** Managed Redis for BullMQ. No Redis server to maintain. Persistence enabled. Free under credits.

### Azure Key Vault
**Why:** All secrets live here — never in environment variables or `.env` files in production. Container Apps reads secrets from Key Vault at runtime. If a secret leaks, rotate it in Key Vault — no redeployment needed.

### Azure Blob Storage
**Why:** Waitlist CSV exports, profile images, any file storage. Cheaper than S3 under Azure credits.

### Azure Communication Services
**Why:** Transactional email (invite emails, confirmations). Replaces Resend. Better deliverability. Free under credits.

### Coralogix (free forever)
**Why:** Observability — logs, metrics, alerts. Free 25 units/day forever. Set up on Day 1. If the backend crashes at 2am before Vancouver, Coralogix tells you why.

## Folder Structure I Own
```
backend/
├── Dockerfile                  # Multi-stage build for Azure Container Apps
├── .github/
│   └── workflows/
│       └── deploy-backend.yml  # GitHub Actions → Azure Container Apps
├── src/
│   ├── index.ts
│   ├── middleware/
│   │   ├── auth.ts             # Firebase JWT verification
│   │   ├── validate.ts         # Zod request validation
│   │   └── rateLimit.ts
│   ├── routes/
│   │   ├── users.ts
│   │   ├── groups.ts
│   │   ├── calendar.ts         # SHELL ONLY — AI engineer implements
│   │   ├── tickets.ts
│   │   └── webhooks.ts
│   ├── db/
│   │   ├── client.ts           # Kysely + Azure PostgreSQL
│   │   ├── types.ts
│   │   └── migrations/
│   ├── jobs/
│   │   ├── queues.ts           # BullMQ + Azure Redis
│   │   ├── worker.ts
│   │   ├── calendarSync.ts
│   │   └── sendInviteEmail.ts  # Azure Communication Services
│   └── lib/
│       ├── firebase.ts
│       ├── email.ts            # Azure Communication Services client
│       ├── storage.ts          # Azure Blob Storage client
│       └── stripe.ts
└── .env.example
```

## Dockerfile
```dockerfile
# Multi-stage build — keeps production image small
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
EXPOSE 4000
CMD ["node", "dist/index.js"]
```

## GitHub Actions — Auto Deploy to Azure Container Apps
```yaml
# .github/workflows/deploy-backend.yml
name: Deploy Backend
on:
  push:
    branches: [agent/backend]
    paths: [backend/**]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: azure/login@v1
        with:
          creds: ${{ secrets.AZURE_CREDENTIALS }}
      - name: Build and push to ACR
        run: |
          az acr build --registry klockn \
            --image backend:${{ github.sha }} \
            ./backend
      - name: Deploy to Container Apps
        run: |
          az containerapp update \
            --name klockn-backend \
            --resource-group klockn-rg \
            --image klockn.azurecr.io/backend:${{ github.sha }}
```

## Environment Variables (Azure Key Vault)
```
DATABASE_URL          # Azure PostgreSQL connection string (SSL required)
FIREBASE_PROJECT_ID
FIREBASE_CLIENT_EMAIL
FIREBASE_PRIVATE_KEY
REDIS_URL             # Azure Cache for Redis connection string
AZURE_COMM_CONNECTION # Azure Communication Services connection string
AZURE_STORAGE_URL     # Azure Blob Storage URL
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
AI_SERVICE_URL        # Internal URL to AI Container App
AI_SERVICE_SECRET
PORT=4000
NODE_ENV=production
```

## Azure PostgreSQL Connection (Kysely)
```typescript
import { Kysely, PostgresDialect } from 'kysely'
import { Pool } from 'pg'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: true }, // Azure PostgreSQL requires SSL
  max: 10,
})

export const db = new Kysely<Database>({ dialect: new PostgresDialect({ pool }) })
```

## API Response Standard
```typescript
// Success
{ "success": true, "data": { ...payload } }
// Error
{ "success": false, "error": "Human readable message" }
```

## Definition of Done
- [ ] Endpoint tested with Postman — returns correct shape
- [ ] Auth required on protected routes — returns 401 without token
- [ ] Zod validation rejects bad input — returns 400
- [ ] TypeScript strict — zero `any`
- [ ] Docker builds locally without errors
- [ ] Deployed to Azure Container Apps and reachable from mobile
- [ ] PR opened with curl examples in the description

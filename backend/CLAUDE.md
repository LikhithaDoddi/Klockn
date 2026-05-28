# Klockn Backend Engineer — Agent Identity & Rules

## Who I Am
I am the Backend Engineer for Klockn. I build and own the Node.js API server, PostgreSQL database, background job queue, and all business logic. I do not touch `/mobile` or `/ai` without explicit Lead Architect approval. The calendar OAuth route (`/backend/src/routes/calendar.ts`) is owned by the AI Engineer — I provide the Express router shell but they implement the logic.

## Read First
Before anything else, read the root `CLAUDE.md`. Every rule there applies to me. The "explain before you code" protocol is mandatory — no exceptions.

## Status
**Production. The API is live and serving real users on AWS ECS Fargate.**

- No breaking API changes without versioning or a migration plan
- Database schema changes require a migration script — never alter tables manually in production
- Rolling deploys only — never cause downtime
- Monitor Coralogix logs after every deploy

## Infrastructure — AWS

### AWS ECS Fargate (compute)
Serverless containers. Docker image → ECR → ECS Fargate. Auto-scales. HTTPS via ALB + ACM.

### AWS RDS PostgreSQL (database)
Fully managed PostgreSQL. SSL enforced. Automated backups. Point-in-time restore available.
**Connection:** Always `sslmode=require` in connection string.

### AWS ElastiCache for Redis (job queue)
Managed Redis for BullMQ. Same VPC as ECS.

### AWS Secrets Manager (secrets)
All secrets live here in production. ECS task definition pulls at runtime. Never in `.env` in production.

### AWS S3 (file storage)
CSV exports, profile images.

### Resend (email)
Transactional email — invite emails, confirmations. Sending domain: `klockn.com`. Uses `RESEND_API_KEY` via `https://api.resend.com/emails`.

### AWS ECR (container registry)
Stores Docker images. GitHub Actions builds and pushes on every deploy.

### Coralogix (observability)
All logs stream here. Check after every production deploy.

## Folder Structure I Own
```
backend/
├── Dockerfile
├── src/
│   ├── index.ts
│   ├── middleware/
│   │   ├── auth.ts             # Firebase JWT verification
│   │   ├── validate.ts         # Zod request validation
│   │   └── rateLimit.ts
│   ├── routes/
│   │   ├── me.ts
│   │   ├── users.ts
│   │   ├── groups.ts           # Groups + member management
│   │   ├── events.ts
│   │   ├── calendar.ts         # SHELL ONLY — AI engineer implements
│   │   ├── ai.ts               # Proxies to AI service
│   │   ├── tickets.ts
│   │   ├── invite.ts
│   │   ├── webhooks.ts
│   │   └── internal.ts
│   ├── db/
│   │   ├── client.ts           # Kysely + RDS PostgreSQL
│   │   └── types.ts
│   ├── migrations/
│   ├── jobs/
│   │   ├── queues.ts           # BullMQ + ElastiCache Redis
│   │   ├── worker.ts
│   │   └── sendInviteEmail.ts
│   └── lib/
│       ├── firebase.ts
│       ├── logger.ts           # Winston logger
│       ├── email.ts            # Resend email client
│       ├── encrypt.ts          # AES-256-GCM for calendar tokens
│       └── stripe.ts
└── .env.example
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
EXPOSE 4000
CMD ["node", "dist/index.js"]
```

## GitHub Actions — Deploy to AWS ECS Fargate
```yaml
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
          docker build -t $ECR_REGISTRY/klockn-backend:$IMAGE_TAG ./backend
          docker push $ECR_REGISTRY/klockn-backend:$IMAGE_TAG
      - name: Deploy to ECS
        run: |
          aws ecs update-service \
            --cluster klockn \
            --service klockn-backend \
            --force-new-deployment
```

## Environment Variables (AWS Secrets Manager in production)
```
DATABASE_URL          # RDS PostgreSQL connection string (sslmode=require)
FIREBASE_PROJECT_ID
FIREBASE_CLIENT_EMAIL
FIREBASE_PRIVATE_KEY
REDIS_URL             # ElastiCache Redis connection string
RESEND_API_KEY        # Resend email API key
AWS_S3_BUCKET=klockn-storage
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
STRIPE_PLATFORM_FEE_PERCENT=2
AI_SERVICE_URL        # Internal URL to AI ECS service
AI_SERVICE_SECRET
ENCRYPTION_KEY        # AES-256-GCM key for calendar tokens
WEB_APP_URL=https://klockn.com
PORT=4000
NODE_ENV=production
```

## API Response Standard
```typescript
{ "success": true, "data": { ...payload } }
{ "success": false, "error": "Human readable message" }
```

## Current API Surface
```
GET  /health
GET  /api/v1/me
PATCH /api/v1/me/push-token
POST /api/v1/groups
GET  /api/v1/groups
GET  /api/v1/groups/:id
POST /api/v1/groups/:id/invite
DELETE /api/v1/groups/:id/members/:memberId
DELETE /api/v1/groups/:id
GET  /api/v1/calendar/google/connect
GET  /api/v1/calendar/google/callback
POST /api/v1/ai/chat
```

## Definition of Done
- [ ] Endpoint tested with curl/Postman — returns correct shape
- [ ] Auth required on protected routes — returns 401 without token
- [ ] Zod validation rejects bad input — returns 400
- [ ] TypeScript strict — zero `any`
- [ ] Docker builds locally without errors
- [ ] Deployed to AWS ECS Fargate and healthy in Coralogix
- [ ] No regressions in existing endpoints
- [ ] PR opened with curl examples in the description

# Klockn Backend Engineer — Agent Identity & Rules

## Who I Am
I am the Backend Engineer for Klockn. I build and own the Node.js API server, PostgreSQL database, background job queue, and all business logic. I do not touch `/mobile` or `/ai` without explicit Lead Architect approval. The calendar OAuth route (`/backend/src/routes/calendar.ts`) is owned by the AI Engineer — I provide the Express router shell but they implement the logic.

## Read First
Before anything else, read the root `CLAUDE.md`. Every rule there applies to me. The "explain before you code" protocol is mandatory — no exceptions.

## My Mission for the 4-Day Sprint
Build a reliable, fast API deployed on AWS ECS Fargate that the mobile app can reach from anywhere. PostgreSQL on AWS RDS. Redis on AWS ElastiCache. Every endpoint the mobile needs — ready on time.

**Day 1 — Foundation**
- Dockerfile written and tested locally
- Express server running locally, connects to AWS RDS PostgreSQL
- Firebase Admin initialized, JWT verification working
- `/health` endpoint returns 200
- `GET /api/v1/me` returns authenticated user profile
- GitHub Actions workflow deploys to AWS ECS Fargate on push to `agent/backend`
- All environment variables stored in AWS Secrets Manager

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
- BullMQ worker running, connected to AWS ElastiCache for Redis

**Day 4 — Notifications + Polish**
- `PATCH /api/v1/me/push-token` — store Expo push token
- `POST /api/v1/internal/notify-group` — internal endpoint for AI service
- Rate limiting verified, error responses consistent
- CloudWatch logs clean, no unhandled rejections

## Infrastructure — AWS

### AWS ECS Fargate (backend compute)
Serverless containers — no EC2 instances to manage. Push a Docker image to ECR, deploy to ECS Fargate. Auto-scales. Built-in load balancing via ALB. HTTPS via ACM certificate.

### AWS RDS PostgreSQL
Fully managed PostgreSQL. Automated backups. Point-in-time restore. SSL enforced. Free tier covers db.t3.micro for the sprint.
**Connection:** Always set `sslmode=require` in connection string.

### AWS ElastiCache for Redis
Managed Redis for BullMQ job queue. cache.t3.micro covers the sprint. Same VPC as ECS.

### AWS Secrets Manager
All secrets live here — never in environment variables or `.env` files in production. ECS task definition pulls secrets from Secrets Manager at runtime.

### AWS S3
Waitlist CSV exports, profile images, any file storage.

### AWS SES (Simple Email Service)
Transactional email — invite emails, confirmations.

### AWS ECR (Elastic Container Registry)
Stores Docker images. GitHub Actions builds and pushes here on every deploy.

### CloudWatch
Logs and metrics. ECS containers stream logs to CloudWatch automatically.

## Folder Structure I Own
```
backend/
├── Dockerfile                  # Multi-stage build for AWS ECS Fargate
├── .github/
│   └── workflows/
│       └── deploy-backend.yml  # GitHub Actions → AWS ECS Fargate
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
│   │   ├── client.ts           # Kysely + AWS RDS PostgreSQL
│   │   ├── types.ts
│   │   └── migrations/
│   ├── jobs/
│   │   ├── queues.ts           # BullMQ + AWS ElastiCache Redis
│   │   ├── worker.ts
│   │   ├── calendarSync.ts
│   │   └── sendInviteEmail.ts  # AWS SES client
│   └── lib/
│       ├── firebase.ts
│       ├── email.ts            # AWS SES client
│       ├── storage.ts          # AWS S3 client
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

## GitHub Actions — Auto Deploy to AWS ECS Fargate
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

## Environment Variables (AWS Secrets Manager)
```
DATABASE_URL          # AWS RDS PostgreSQL connection string (SSL required)
FIREBASE_PROJECT_ID
FIREBASE_CLIENT_EMAIL
FIREBASE_PRIVATE_KEY
REDIS_URL             # AWS ElastiCache Redis connection string
AWS_SES_REGION        # us-east-1
AWS_S3_BUCKET         # klockn-storage
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
AI_SERVICE_URL        # Internal URL to AI ECS service
AI_SERVICE_SECRET
PORT=4000
NODE_ENV=production
```

## AWS RDS PostgreSQL Connection (Kysely)
```typescript
import { Kysely, PostgresDialect } from 'kysely'
import { Pool } from 'pg'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: true }, // RDS requires SSL
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
- [ ] Deployed to AWS ECS Fargate and reachable from mobile
- [ ] PR opened with curl examples in the description

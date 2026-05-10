# Klockn — Founder Supervision Guide

## How to run the team

You have 3 Claude Code agents running in VS Code.
Each is in a separate window, on a separate branch, with its own CLAUDE.md.
You are the only one who approves PRs. Nothing ships without you.

---

## One-Time Setup (do this before agents start)

### Step 1 — Create the GitHub repo (5 minutes)
```bash
cd "c:\Users\likit\Desktop\Klockn"
git init
git add .
git commit -m "Initial project structure"
# Create repo at github.com → New repository → name: klockn → private
git remote add origin https://github.com/YOUR_USERNAME/klockn.git
git push -u origin main
```

### Step 2 — Create the 3 agent branches (2 minutes)
```bash
git checkout -b agent/mobile  && git push -u origin agent/mobile  && git checkout main
git checkout -b agent/backend && git push -u origin agent/backend && git checkout main
git checkout -b agent/ai      && git push -u origin agent/ai      && git checkout main
```

### Step 3 — Protect main on GitHub
GitHub → Settings → Branches → Add rule → `main`
- Check: Require pull request reviews before merging
- Check: Require status checks to pass

### Step 4 — Set up AWS (using $100 AWS Activate credit — migrate to Azure when approved)

**Install AWS CLI first:**
```bash
# Windows
winget install Amazon.AWSCLI

# Then configure
aws configure
# Enter: Access Key ID, Secret Access Key, region: us-east-1, output: json
```

**Create all AWS resources:**
```bash
# 1. Create ECR repositories (stores Docker images)
aws ecr create-repository --repository-name klockn-backend --region us-east-1
aws ecr create-repository --repository-name klockn-ai --region us-east-1

# 2. Create RDS PostgreSQL
aws rds create-db-instance \
  --db-instance-identifier klockn-db \
  --db-instance-class db.t3.micro \
  --engine postgres \
  --engine-version 15 \
  --master-username klocknadmin \
  --master-user-password YOUR_SECURE_PASSWORD \
  --allocated-storage 20 \
  --no-multi-az \
  --publicly-accessible

# 3. Create ElastiCache Redis
aws elasticache create-cache-cluster \
  --cache-cluster-id klockn-redis \
  --cache-node-type cache.t3.micro \
  --engine redis \
  --num-cache-nodes 1

# 4. Create ECS Cluster
aws ecs create-cluster --cluster-name klockn

# 5. Create S3 bucket
aws s3 mb s3://klockn-storage --region us-east-1

# 6. Create Secrets Manager secrets
aws secretsmanager create-secret --name klockn/DATABASE_URL --secret-string "YOUR_CONNECTION_STRING"
aws secretsmanager create-secret --name klockn/ANTHROPIC_API_KEY --secret-string "YOUR_KEY"
aws secretsmanager create-secret --name klockn/FIREBASE_PRIVATE_KEY --secret-string "YOUR_KEY"
# Add all other secrets from backend/CLAUDE.md and ai/CLAUDE.md
```

**Add GitHub Actions credentials:**
```bash
# Create IAM user for GitHub Actions
aws iam create-user --user-name klockn-github-actions
aws iam attach-user-policy \
  --user-name klockn-github-actions \
  --policy-arn arn:aws:iam::aws:policy/AmazonECS_FullAccess
aws iam attach-user-policy \
  --user-name klockn-github-actions \
  --policy-arn arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryFullAccess
aws iam create-access-key --user-name klockn-github-actions
# Copy AccessKeyId → GitHub repo → Settings → Secrets → AWS_ACCESS_KEY_ID
# Copy SecretAccessKey → GitHub repo → Settings → Secrets → AWS_SECRET_ACCESS_KEY
```

### Step 5 — Open 3 VS Code windows
```
Window 1: open Klockn folder → git checkout agent/mobile  → open Claude Code
Window 2: open Klockn folder → git checkout agent/backend → open Claude Code
Window 3: open Klockn folder → git checkout agent/ai      → open Claude Code
```

---

## Daily Supervision Routine

### Morning (5 min)
GitHub → Pull Requests. See what each agent submitted.

### During development
Each agent gives you a TASK BRIEF before writing code:
- "Approved — go ahead"
- "Change X first"
- "Question: why not Y?"

### When an agent opens a PR
1. Read the description
2. **Mobile PRs** — scan Expo QR, test on your phone
3. **Backend PRs** — test endpoint with curl examples in the PR
4. **AI PRs** — verify calendar connect or chat response
5. Approve → merge to main → Azure auto-deploys via GitHub Actions

---

## How to Talk to Each Agent

**Start a task:**
```
"Build the Google Calendar OAuth connect flow.
 Follow the task brief protocol before writing any code."
```

**If agent skips the brief:**
```
"Stop. Give me the task brief first.
 What are you building, why, and what files will you touch.
 Wait for my approval before writing any code."
```

**Status check:**
```
"Status update: what's done, what are you working on, what's blocked?"
```

---

## AWS Console — Where to Watch Things

| What to check | Where |
|--------------|-------|
| ECS services running | console.aws.amazon.com → ECS → klockn cluster |
| Database connections | console.aws.amazon.com → RDS → klockn-db → Monitoring |
| Redis usage | console.aws.amazon.com → ElastiCache → klockn-redis |
| App logs | console.aws.amazon.com → CloudWatch → Log groups |
| Credit/cost usage | console.aws.amazon.com → Billing → Credits |
| Coralogix dashboard | Your Coralogix account (free forever observability) |

**Set a billing alert immediately:**
```bash
aws budgets create-budget \
  --account-id YOUR_ACCOUNT_ID \
  --budget '{"BudgetName":"klockn-alert","BudgetLimit":{"Amount":"80","Unit":"USD"},"TimeUnit":"MONTHLY","BudgetType":"COST"}' \
  --notifications-with-subscribers '[{"Notification":{"NotificationType":"ACTUAL","ComparisonOperator":"GREATER_THAN","Threshold":80},"Subscribers":[{"SubscriptionType":"EMAIL","Address":"likithawa2020@gmail.com"}]}]'
```
Alert fires at $80 — keeps you well within the $100 credit.

---

## 4-Day Sprint Checklist

### Day 1 — verify on your phone
- [ ] `expo start` → QR code appears → scan → app opens on phone
- [ ] `https://klockn-backend.azurecontainerapps.io/health` → `{"status":"ok"}`
- [ ] Azure Portal shows PostgreSQL connected
- [ ] Auth screens visible in app

### Day 2 — verify on your phone
- [ ] Sign up with email → user created in Firebase + Azure PostgreSQL
- [ ] Log in → main tabs appear
- [ ] Tap "Connect Google Calendar" → browser opens → grant access → back in app
- [ ] Your week shows free/busy bars

### Day 3 — need 2 phones or 2 accounts
- [ ] Create group "Test Group"
- [ ] Invite second account
- [ ] Second account connects calendar
- [ ] Both phones show group availability with real data
- [ ] A free slot glows green

### Day 4 — verify full demo flow
- [ ] Block your calendar for tomorrow
- [ ] Push notification arrives
- [ ] Tap → AI chat opens
- [ ] Type "let's plan a weekend trip" → AI responds
- [ ] Booking card renders correctly

---

## Vancouver Demo Script

```
1. "This is Klockn — open on my phone right now."
   Show the home screen.

2. "I have a group here called Family."
   Show the Groups tab.

3. "Klockn only shows when people are free or busy.
   Nobody can see what I'm doing — just whether I'm available."
   Show the availability screen, point out free/busy bars.

4. "Klockn found a window — Friday evening, everyone in my
   family is free at the same time."
   Show the green slot.

5. "The moment that window opened, Klockn told me."
   Show the push notification.

6. "I tap it, say yes, and start a conversation."
   Open the AI chat.

7. "Weekend trip somewhere warm."
   Type it, show the AI response.

8. "Klockn found a villa, sorted rides for everyone,
   and sent confirmations — one conversation."
   Show the booking card.

9. "No more 'when is everyone free?'
   Klockn already knows. And it handles everything."
```

---

## If Something Goes Wrong on Stage

| Problem | Fix |
|---------|-----|
| App won't load | Switch to screenshots on iPad |
| Push notification doesn't fire | Tap the pre-staged notification in notification center |
| AI chat is slow | Pre-load the screen before going on stage |
| Azure Container App down | ngrok tunnel to laptop as emergency fallback |

**Always have screenshots of every screen as backup.**

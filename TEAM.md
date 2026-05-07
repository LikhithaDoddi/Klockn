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

### Step 4 — Set up Azure (once credits are approved)

**Install Azure CLI first:**
```bash
# Windows
winget install Microsoft.AzureCLI

# Then log in
az login
```

**Create all Azure resources:**
```bash
# 1. Create resource group (everything lives here)
az group create --name klockn-rg --location eastus

# 2. Create Azure Container Registry (stores Docker images)
az acr create --resource-group klockn-rg --name klockn --sku Basic

# 3. Create PostgreSQL Flexible Server
az postgres flexible-server create \
  --resource-group klockn-rg \
  --name klockn-db \
  --admin-user klocknadmin \
  --admin-password YOUR_SECURE_PASSWORD \
  --sku-name Standard_B1ms \
  --tier Burstable \
  --version 15

# 4. Create Redis Cache
az redis create \
  --resource-group klockn-rg \
  --name klockn-redis \
  --sku Basic \
  --vm-size c0

# 5. Create Container Apps environment
az containerapp env create \
  --name klockn-env \
  --resource-group klockn-rg \
  --location eastus

# 6. Create Key Vault for secrets
az keyvault create \
  --name klockn-vault \
  --resource-group klockn-rg \
  --location eastus

# 7. Create Blob Storage
az storage account create \
  --name klocknstorage \
  --resource-group klockn-rg \
  --sku Standard_LRS
```

**Get connection strings for agents:**
```bash
# PostgreSQL connection string
az postgres flexible-server show-connection-string \
  --server-name klockn-db \
  --admin-user klocknadmin \
  --admin-password YOUR_SECURE_PASSWORD \
  --database-name klockn

# Redis connection string
az redis list-keys --name klockn-redis --resource-group klockn-rg

# Storage connection string
az storage account show-connection-string \
  --name klocknstorage \
  --resource-group klockn-rg
```

**Store all secrets in Key Vault:**
```bash
az keyvault secret set --vault-name klockn-vault --name DATABASE-URL --value "YOUR_CONNECTION_STRING"
az keyvault secret set --vault-name klockn-vault --name FIREBASE-PROJECT-ID --value "..."
az keyvault secret set --vault-name klockn-vault --name ANTHROPIC-API-KEY --value "..."
az keyvault secret set --vault-name klockn-vault --name REDIS-URL --value "..."
# Add all other secrets from backend/CLAUDE.md and ai/CLAUDE.md
```

**Add GitHub Actions credentials:**
```bash
# Create service principal for GitHub Actions to deploy
az ad sp create-for-rbac \
  --name klockn-github-actions \
  --role contributor \
  --scopes /subscriptions/YOUR_SUB_ID/resourceGroups/klockn-rg \
  --sdk-auth
# Copy the JSON output → GitHub repo → Settings → Secrets → AZURE_CREDENTIALS
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

## Azure Portal — Where to Watch Things

| What to check | Where |
|--------------|-------|
| Container Apps running | portal.azure.com → klockn-rg → Container Apps |
| Database connections | portal.azure.com → klockn-db → Monitoring |
| Redis usage | portal.azure.com → klockn-redis → Overview |
| App logs | portal.azure.com → klockn-backend → Log stream |
| Credit usage | portal.azure.com → Cost Management + Billing |
| Coralogix dashboard | Your Coralogix account (free forever observability) |

**Set a billing alert immediately:**
```bash
az consumption budget create \
  --budget-name klockn-alert \
  --amount 200 \
  --time-grain Monthly \
  --category Cost \
  --resource-group klockn-rg
```
Alert fires at $200. At $150-250/month burn you'll never hit it, but set it anyway.

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

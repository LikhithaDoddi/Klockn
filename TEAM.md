# Klockn — Founder Supervision Guide

## Status: Production
The demo is done. Klockn is live. We are building for real users now.

---

## How to Run the Team

You have 3 Claude Code agents running in VS Code.
Each is in a separate window, on a separate branch, with its own CLAUDE.md.
You are the only one who approves PRs. Nothing ships without you.

---

## Branch Setup
```
main          → production. Founder approves all PRs before merge.
agent/mobile  → Mobile Engineer
agent/backend → Backend Engineer
agent/ai      → AI Engineer
```

## VS Code Windows
```
Window 1: Klockn folder → git checkout agent/mobile  → Claude Code
Window 2: Klockn folder → git checkout agent/backend → Claude Code
Window 3: Klockn folder → git checkout agent/ai      → Claude Code
```

---

## Daily Supervision Routine

### Morning (5 min)
GitHub → Pull Requests. See what each agent submitted overnight.

### When reviewing a PR
1. Read the description
2. **Mobile PRs** — install build or test on device
3. **Backend PRs** — test endpoint with curl examples in the PR
4. **AI PRs** — verify calendar connect or chat response end-to-end
5. Approve → merge to main → AWS auto-deploys via GitHub Actions

### After every production deploy
- Watch Coralogix logs for 10 minutes
- Check AWS ECS console — all tasks healthy
- Spot-check the affected feature in the live app

---

## How to Talk to Each Agent

**Start a task:**
```
"Build [feature].
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
| App logs | Coralogix dashboard |
| Email sending | console.aws.amazon.com → SES → Account dashboard |
| Cost usage | console.aws.amazon.com → Billing → Credits |

**Billing alert is set at $80/month — fires to likithawa2020@gmail.com.**

---

## Production Checklist (verify after major changes)

- [ ] `https://api.klockn.com/health` → `{"status":"ok"}`
- [ ] AWS Console shows RDS PostgreSQL connected
- [ ] Sign up with email → user created in Firebase + AWS RDS
- [ ] Log in → main tabs appear
- [ ] Google Calendar connect → browser opens → grant → back in app
- [ ] Create group → invite member → availability grid shows
- [ ] AI chat responds with a time suggestion
- [ ] Push notification received on device

---

## If Something Goes Wrong in Production

| Problem | Fix |
|---------|-----|
| ECS task crashing | Check Coralogix logs → identify error → hotfix on agent branch → PR → deploy |
| Database connection lost | Check RDS console → security group rules → connection string in Secrets Manager |
| AI chat down | Check AI service ECS task health → check Anthropic API status |
| AWS ECS service down | ngrok tunnel to laptop as emergency fallback while fixing |

**Always have a rollback plan before deploying risky changes.**

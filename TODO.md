# Klockn — Founder To-Do List
# Last updated: May 2026

---

## Infrastructure Decision — LOCKED ✅
**Use Azure now. AWS later if Generative AI Accelerator credits come through.**
- Azure: $150,000 confirmed, 750 months at current burn rate, unlimited engineer support included
- AWS: Apply for credits as backup and future scale — do not build on AWS yet
- Migration path: Docker containers are portable — if AWS Generative AI Accelerator accepts us, migrate in 1 day

---

## URGENT — Do Before Vancouver (4 days)

### Perks to Claim
- [ ] **Microsoft for Startups** — go to startups.microsoft.com, enter Deel partner code, apply with the 488-char description. Do NOT activate Azure credits until Day 1 of build sprint.
- [ ] **AltaIR Capital AltaLab** — apply immediately. Built by team behind Deel, Miro, Turing. Direct funding path. Don't go to Vancouver without this submitted.
- [ ] **AWS Activate Founders** ($1,000) — apply at aws.amazon.com/activate. Takes 10 minutes. You have klockn.com — that's all you need. Keep as backup cloud credits.
- [ ] **Miro** ($1,000 credit) — build pitch deck and product flow for Vancouver. Select "Deel Pitch" as referral partner.
- [ ] **Flowlie** (3 months free) — identify investors before the summit. Walk in with warm leads already found.
- [ ] **SS&C Intralinks** (free data room) — email deelpitchbattle@sscinc.com. Have a data room ready when investors ask for it on stage.
- [ ] **Coralogix** (free forever observability) — claim now, use from day one. Replaces Azure Monitor for free. Forever.

### Product
- [ ] Confirm GitHub account exists and is ready for team repo
- [ ] Activate Azure credits on Day 1 of build sprint (not before — clock starts on activation)
- [ ] Create hello@klockn.com in GoDaddy cPanel
- [ ] Upload all landing page files to cPanel (see web/landing/UPLOAD_INSTRUCTIONS.md)
- [ ] Change admin.php password from default `klockn2026`
- [ ] Test waitlist form sends email to likithawa2020@gmail.com
- [ ] Practice Vancouver demo script (see TEAM.md)

### Business
- [ ] **Stripe Atlas** — incorporate as US Delaware C-Corp before raising ($100 off via Deel). Investors require this.
- [ ] **Slash** — open Klockn business bank account
- [ ] **Google Workspace** — set up team email at klockn.com (65% off via Deel)

---

## This Week (Post-Vancouver)

### Build
- [ ] Create GitHub repo and 3 agent branches (agent/mobile, agent/backend, agent/ai)
- [ ] Activate Azure credits + set up infrastructure (Container Apps, PostgreSQL, Redis, Blob Storage)
- [ ] Update agent CLAUDE.md files from Railway → Azure (backend/CLAUDE.md, ai/CLAUDE.md, TEAM.md)
- [ ] Open 3 VS Code windows, one per agent branch, Claude Code running in each
- [ ] Day 1: Foundation — app on Expo Go, backend live on Azure Container Apps, DB connected
- [ ] Day 2: Auth + Google Calendar connect working on real phone
- [ ] Day 3: Groups + 2 phones showing shared availability in real time
- [ ] Day 4: AI notification + booking chat demo-ready

### Perks to Claim
- [ ] **Notion** (6 months free Business + AI) — team docs, roadmap, meeting notes
- [ ] **FullEnrich** (300 free credits + 50% off) — find event organizer emails for first B2B outreach
- [ ] **Slack** (25% off) — team communication when co-founder is active

---

## Post-Vancouver — AWS Credit Applications

Apply for these after Vancouver, in priority order:

- [ ] **AWS Activate Portfolio** ($25K–$100K, 24 months) — apply immediately after any accelerator accepts you (AltaIR, YC, Techstars). Use their provider Organization ID. This is the upgrade from Founders tier.
- [ ] **AWS Generative AI Accelerator** (up to $1,000,000) — apply post-Vancouver. Klockn is an AI platform. <2% acceptance but enormous upside. Program is 8-10 weeks, late-seed to Series A stage.
- [ ] **AWS Impact Accelerator** ($100K credits + $125K equity-free cash) — check eligibility. Underrepresented founders (Black, Women, Latino/Latina, LGBTQIA+). If you qualify, apply immediately.

**Credit stacking potential:**
```
AWS Activate Founders        $1,000   ← claim today
AWS Activate Portfolio       $25,000  ← after accelerator acceptance
AWS Generative AI            $1,000,000 ← post-Vancouver application
────────────────────────────────────
Potential total AWS:         $1,026,000
Azure (confirmed):           $150,000
────────────────────────────────────
Combined possible:           $1,176,000
```

---

## When You Hire First Person

- [ ] **Deel** ($5,000 credits + free payroll for life) — use for payroll/HR
- [ ] **JumpCloud** (3 months free) — IT and device management
- [ ] **Corgi** (20% off) — business insurance

---

## Skip Until Product-Market Fit

- [ ] Scytale (SOC 2 / ISO 27001) — wait until enterprise clients require it
- [ ] Alta (AI sales automation) — too early
- [ ] AstroPay — not needed yet
- [ ] Island (enterprise browser) — not relevant

---

## Fundraising Checklist (Vancouver Ready)

- [ ] Pitch deck built in Miro
- [ ] Data room live on Intralinks
- [ ] Flowlie investor list identified
- [ ] AltaIR AltaLab application submitted
- [ ] Market research PDF ready to share (web/landing/market-research.html → Save as PDF)
- [ ] Demo working on phone (see TEAM.md for script)
- [ ] Know your numbers cold:
  - TAM: $500B+
  - CAC B2B: $50–100
  - CAC B2C: $0 (B2B wedge)
  - LTV:CAC B2B: 38:1
  - Break-even: 2 event organizers
  - Infrastructure cost: ~$150/month on Azure credits

---

## Key Files to Know

| File | What it is |
|------|-----------|
| `CLAUDE.md` | Team rules — every agent reads this |
| `TEAM.md` | How to supervise agents + Vancouver demo script |
| `mobile/CLAUDE.md` | Mobile agent identity and rules |
| `backend/CLAUDE.md` | Backend agent identity and rules (needs Azure update) |
| `ai/CLAUDE.md` | AI agent identity and rules (needs Azure update) |
| `web/landing/index.html` | Landing page |
| `web/landing/admin.php` | Your leads dashboard (klockn.com/admin) |
| `web/landing/market-research.html` | Competitive analysis PDF for co-founder |
| `web/landing/UPLOAD_INSTRUCTIONS.md` | cPanel upload guide |
| `TODO.md` | This file |

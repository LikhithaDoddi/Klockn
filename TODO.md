# Klockn — Founder To-Do List
# Last updated: May 2026

---

## Infrastructure — LOCKED on AWS
- AWS RDS PostgreSQL, ECS Fargate, ElastiCache Redis, S3, SES, Secrets Manager, Route 53
- Apply for additional AWS credits to extend runway (see Credit Applications below)

---

## Active — Build

### Product (now)
- [ ] Events API — create event, lock window, send RSVPs, cancel
- [ ] Stripe ticketing — purchase flow, 2% platform fee, webhooks
- [ ] Push notifications — fire when AI finds optimal free window
- [ ] App Store submission — requires Apple Developer account
- [ ] Google Play submission — requires Google Play Console account

### Infrastructure
- [ ] AWS SES production access approved (pending AWS review)
- [ ] Route 53 DNS → api.klockn.com pointing to ECS ALB
- [ ] Coralogix alerts configured for error spikes and ECS restarts
- [ ] AWS billing alert set ($80/month trigger → likithawa2020@gmail.com)

---

## Business

- [ ] **Stripe Atlas** — incorporate as US Delaware C-Corp before raising ($100 off via Deel). Investors require this.
- [ ] **Slash** — open Klockn business bank account
- [ ] **Google Workspace** — set up team email at klockn.com (hello@klockn.com, noreply@klockn.com)
- [ ] Create hello@klockn.com in GoDaddy cPanel

---

## AWS Credit Applications

Apply in priority order:

- [ ] **AWS Activate Founders** ($1,000) — apply at aws.amazon.com/activate. Takes 10 minutes.
- [ ] **AWS Activate Portfolio** ($25K–$100K, 24 months) — apply after any accelerator acceptance (AltaIR, YC, Techstars). Use their provider Organization ID.
- [ ] **AWS Generative AI Accelerator** (up to $1,000,000) — Klockn is an AI platform. Apply now. 8-10 week program.
- [ ] **AWS Impact Accelerator** ($100K credits + $125K equity-free cash) — check eligibility for underrepresented founders.

**Credit stacking potential:**
```
AWS Activate Founders        $1,000   ← claim today
AWS Activate Portfolio       $25,000  ← after accelerator acceptance
AWS Generative AI            $1,000,000 ← apply now
────────────────────────────────────
Potential total AWS:         $1,026,000
```

---

## Fundraising

- [ ] Pitch deck built
- [ ] Data room ready (SS&C Intralinks — email deelpitchbattle@sscinc.com)
- [ ] **AltaIR Capital AltaLab** — apply. Built by team behind Deel, Miro, Turing. Direct funding path.
- [ ] **Flowlie** — identify investors, build warm lead list
- [ ] Know your numbers cold:
  - TAM: $500B+
  - CAC B2B: $50–100
  - CAC B2C: $0 (B2B wedge)
  - LTV:CAC B2B: 38:1
  - Break-even: 2 event organizers
  - Infrastructure cost: ~$150/month on AWS

---

## Perks to Claim

- [ ] **AWS Activate Founders** ($1,000 credits) — aws.amazon.com/activate
- [ ] **Miro** ($1,000 credit) — pitch deck and product flow
- [ ] **Notion** (6 months free Business + AI) — team docs, roadmap
- [ ] **FullEnrich** (300 free credits + 50% off) — find event organizer emails for B2B outreach
- [ ] **Deel** ($5,000 credits + free payroll for life) — payroll/HR when first hire
- [ ] **Coralogix** (free forever observability) — claim and configure now

---

## Skip Until Product-Market Fit

- [ ] Scytale (SOC 2 / ISO 27001) — wait until enterprise clients require it
- [ ] Alta (AI sales automation) — too early
- [ ] JumpCloud — wait until team is 3+

---

## Key Files

| File | What it is |
|------|-----------|
| `CLAUDE.md` | Team rules — every agent reads this |
| `TEAM.md` | How to supervise agents + production runbook |
| `mobile/CLAUDE.md` | Mobile agent identity and rules |
| `backend/CLAUDE.md` | Backend agent identity and rules |
| `ai/CLAUDE.md` | AI agent identity and rules |

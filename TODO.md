# Klockn — Todo / Progress Log

## Completed — 2026-05-22 / 2026-05-23

### iOS / TestFlight
- [x] Bumped `buildNumber` from `"1"` → `"3"` in `mobile/app.json` (builds 1 and 2 already used/submitted)
- [x] Triggered EAS production build with `eas build --platform ios --profile production`
- [x] Build completed — IPA artifact available on Expo dashboard
- [x] Submitted to TestFlight via `eas submit --platform ios --latest`

### GitHub Actions — Deploy Backend (agent/backend)
- [x] Diagnosed crash: `Cannot find module 'dotenv/config'` — caused by `dotenv ^17.4.2` breaking the `/config` subpath export
- [x] Downgraded `dotenv` to `^16.4.5` in `backend/package.json`
- [x] Regenerated root `package-lock.json` via `npm install`
- [x] Committed and pushed — deploy triggered and should now stabilize

### GitHub Actions — Deploy AI Service (main)
- [x] Diagnosed build failure: `docker build ./ai` used `./ai` as context, but `ai/Dockerfile` copies from `shared/` which is outside that context
- [x] Fixed `deploy-ai.yml`: changed build command to `docker build -f ai/Dockerfile .` (repo root as context)
- [x] Fix committed alongside backend changes — takes effect on next AI deploy

## Completed — 2026-05-23 (iOS auth + invite fixes)

- [x] Fixed Firebase auth persistence: switched `require('@firebase/auth')` → `require('firebase/auth')` so Metro resolves the React Native bundle (not browser bundle). Auth sessions now survive app restarts.
- [x] Fixed Apple Sign In nonce: generate a crypto nonce with `crypto.getRandomValues`, SHA-256 hash it, pass hash to Apple and raw to Firebase — was previously passing `authorizationCode` as `rawNonce` which Firebase rejects.
- [x] Fixed Google Sign In: switched from `useAuthRequest` → `useIdTokenAuthRequest` and read `result.params.id_token` directly — code flow doesn't return idToken in `result.authentication`.
- [x] All `@firebase/auth` imports in auth files changed to `firebase/auth`.
- [x] TypeScript passes with zero errors.

## In Progress

- [ ] Confirm backend ECS service stabilizes after dotenv fix deploy
- [ ] Confirm TestFlight build (number 3) appears in App Store Connect and is available to testers
- [ ] Trigger new EAS build (build #4) to ship auth fixes + create group FAB to TestFlight

## Up Next

- [ ] Add `RESEND_API_KEY` to AWS Secrets Manager + ECS task definition so invite emails send
- [ ] Open PR: `agent/backend` → `main` for founder review and merge
- [ ] AI service deploy — verify it succeeds with corrected Docker build context on next AI engineer push

# Google Sign-In — final wiring (one-time)

All the app code is already wired. Google Sign-In stays **hidden** until the two
OAuth client IDs below are filled in — so nothing breaks in the meantime (Apple +
email work today). Do these three steps once and Google lights up.

## 1. Get the client IDs
Firebase console → Project `klockn-80398` → **Project settings** → your apps:
- **iOS app** → `GoogleService-Info.plist` → copy `CLIENT_ID` (the iOS OAuth client ID)
  and `REVERSED_CLIENT_ID` (looks like `com.googleusercontent.apps.439208454942-xxxx`).
- **Web client** (Authentication → Sign-in method → Google → Web SDK config) → copy the
  **Web client ID** (Firebase uses this to verify the Google credential).

## 2. Fill the env values
Put the **iOS** and **Web** client IDs into both `eas.json` (all three `env` blocks)
and `mobile/.env.local`:

```
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=439208454942-xxxx.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=439208454942-yyyy.apps.googleusercontent.com
```

(Android can stay empty until we ship Android.)

## 3. Register the iOS URL scheme
Add the **REVERSED_CLIENT_ID** to `app.json` under `ios.infoPlist` so the native
build can receive the OAuth redirect:

```json
"ios": {
  "infoPlist": {
    "CFBundleURLTypes": [
      { "CFBundleURLSchemes": ["com.googleusercontent.apps.439208454942-xxxx"] }
    ]
  }
}
```

That's it. The next EAS build regenerates the native project with the scheme, the
`hasGoogleConfig` gate flips true, and the "Continue with Google" button appears and
works on login + signup.

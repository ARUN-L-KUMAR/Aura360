# Aura360 mobile

Expo (React Native, TypeScript, Expo Router) app for Aura360. It talks to the same Next.js server as the web app,
using bearer-token auth (`/api/mobile/auth/*`).

## Run it

```bash
# 1. Server (repo root), once: create the refresh-token table, then start the app
npm run db:create-mobile-auth
npm run dev

# 2. Mobile
cd mobile
npm install
npx expo start
```

Open it with Expo Go on a phone (same Wi-Fi as the laptop) or an emulator.

- The API address is worked out automatically from the Metro host (`http://<laptop-ip>:3000`).
  Override it with `EXPO_PUBLIC_API_URL` in `mobile/.env`, or on the sign-in screen ("Server").
- If the phone can't reach the server, allow Node/port 3000 and 8081 through the Windows firewall.
- Sign in with an existing, email-verified Aura360 account.

## Layout

```
src/app/            routes (Expo Router): (auth) = signed out, (app)/(tabs) = signed in
src/lib/api.ts      fetch client: bearer token, single-flight refresh on 401, typed errors
src/lib/storage.ts  tokens in expo-secure-store
src/providers/      auth + react-query
src/features/       per-module code (dashboard so far)
src/components/ui/  shared building blocks
src/theme/          colours (light/dark) and module accents
```

## Checks

```bash
npm run typecheck
npx expo-doctor
```

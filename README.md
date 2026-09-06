# BuyNextDoor Seller — Mobile

The seller portal as a native app. Expo (React Native) + TypeScript, iOS and Android
from one codebase.

The web portal it mirrors is `buynextdoor-fe/apps/hub`; the API is
`buynextdoor-api` (Laravel). Where this repo and the web disagree on a
convention, the web's `CLAUDE.md` is the reason — the differences are listed
under [Where this differs from the web](#where-this-differs-from-the-web).

---

## Quick start

```bash
npm install
npm start           # then press `a` for Android, `i` for iOS
```

Defaults to the Laravel **staging** API. To run against an API on your laptop:

```bash
EXPO_PUBLIC_API_URL=http://192.168.1.5:8001 npm start
```

Use your machine's LAN IP, not `localhost` — on a phone `localhost` is the phone.

---

## Two things block a real login today

Neither lives in this repo. Both are small, and both are in `buynextdoor-api`.

### 1. The API cannot issue a token to a native client

`AuthController::login` calls `auth()->login($user)` on the `web` guard and
returns a session cookie. `App\Domain\Identity\Models\User` does not use
`HasApiTokens`, and there is no `personal_access_tokens` table. A native app has
no cookie jar to put a session in, so **login returns 200 and the app still has
no credential**.

The fix is Sanctum's token half — _not_ Passport. Passport is an OAuth2
authorization server for delegating access to third parties; this is a
first-party app, and adding it would mean a second auth stack alongside the
`auth:sanctum` middleware all 399 routes already use.

Three pieces:

1. Add the `personal_access_tokens` migration (`php artisan vendor:publish
--provider="Laravel\Sanctum\SanctumServiceProvider"`).
2. `use Laravel\Sanctum\HasApiTokens;` on the User model.
3. In `login`, when the request carries `device_name`, return
   `$user->createToken($request->device_name)->plainTextToken` in the payload
   and skip the session login. In `logout`, `$request->user()->currentAccessToken()->delete()`.

Nothing else changes. `auth:sanctum` already accepts a bearer token _or_ a
session cookie, and `EnsureFrontendRequestsAreStateful` only switches to cookie
mode when the request `Origin` matches `SANCTUM_STATEFUL_DOMAINS` — a native app
sends no such origin and falls through to token auth. **The web is unaffected.**

This app already sends `device_name` on login and reads `data.token`
(`src/api/domains/auth.ts`), so it starts working the moment the API does.

### 2. Production still runs AdonisJS

Probed 2026-09-06:

| Host                         | `/up` | Backend             |
| ---------------------------- | ----- | ------------------- |
| `api.staging.buynextdoor.ph` | 200   | **Laravel**         |
| `api-staging.buynextdoor.ph` | 404   | Adonis (legacy)     |
| `api.buynextdoor.ph`         | 404   | **Adonis (legacy)** |

This app speaks Laravel only — it has no proxy mode and no Adonis adapters. So
every EAS profile, production included, points at staging until the API cutover
lands. Repoint `production.env.EXPO_PUBLIC_API_URL` in `eas.json` on the day.

---

## Layout

```
app/                      expo-router routes (file = route)
  _layout.tsx             providers; the only place they are mounted
  index.tsx               the gate — splash until "signed in?" is known
  (auth)/                 login, forgot password. Unreachable once signed in.
  (portal)/               everything behind the wall
    _layout.tsx           auth guard + Stack
    (tabs)/               the four daily sections + More
    <section>.tsx         pushed from More, with a back button
src/
  api/                    apiFetch + per-domain modules and query hooks
  auth/                   token keystore, session state machine
  ui/                     primitives (Button, Card, Field, Screen, states)
  navigation/sections.ts  the IA, mirroring the web sidebar
  theme/tokens.ts         colours for what className cannot reach
  lib/                    formatting, cn
```

### Navigation

The web fits 22 sections in a sidebar; a phone cannot. Four earn a bottom tab —
Dashboard, Orders, Catalogue, Wallet — and **More** renders the rest in the same
groups, same order, same labels as `HubShell.tsx`. A seller who knows the website
is not relearning anything.

---

## Where this differs from the web

Three deliberate departures. Everything else follows the web's conventions.

**The credential.** The web's rule is that the browser never holds a credential
it can read, kept by an httpOnly cookie. Native has no httpOnly cookie, so the
equivalent guarantee is the platform keystore: `expo-secure-store` puts the token
in the iOS Keychain and Android's EncryptedSharedPreferences. Never move it to
`AsyncStorage` — that is a plaintext file in the app sandbox, and it goes into
device backups.

**No CSRF.** Bearer auth is not ambient the way a cookie is, so there is nothing
for a hostile site to ride and nothing to echo back. `src/api/client.ts` is the
web's `apiFetch` minus the CSRF dance.

**Laravel only.** The web carries adapters for both backends mid-cutover. This
app was never pointed at Adonis, so `wire.ts` has one branch instead of two.
The casing adapters in `src/api/domains/seller.ts` are kept tolerant anyway —
that is the bug that took the web dashboard down, and accepting both spellings
costs nothing.

Session state is also a three-state machine (`loading | authenticated |
anonymous`) rather than a React Query hook, because the first paint has to answer
"login screen or app?" and that answer needs an async keystore read. Modelling it
this way keeps the splash up instead of flashing login at a signed-in seller on
every cold start.

---

## What is built

|             |                                                                                                                            |
| ----------- | -------------------------------------------------------------------------------------------------------------------------- |
| **Working** | Login, forgot password, session restore + sign-out, auth guard, dashboard (all 14 metrics + SKU counter), navigation shell |
| **Stubbed** | The other 19 sections. Each is a real route that says so and points at the website, rather than a fake empty state         |

Ported sections replace the stub in place; nothing else has to move.

---

## Commands

```bash
npm start              # dev server
npm run android        # dev server + Android
npm run ios            # dev server + iOS
npm run typecheck      # tsc --noEmit
npm run lint
npm run format
npx expo-doctor        # config + dependency health
```

### Builds

```bash
npx eas build --profile staging --platform android   # internal APK
npx eas build --profile staging --platform ios       # needs an Apple Developer account
```

iOS builds run on EAS's macOS workers, so local Xcode is not required — which is
just as well, since this machine has Command Line Tools only.

---

## Notes

- **`.npmrc` sets `legacy-peer-deps=true`.** Expo SDK 57 ships a skew in its own
  tree (`expo-router` pulls `react-dom@19.2.8`, which peer-requires
  `react@^19.2.8`, while Expo pins `react@19.2.3`). Without it, `npm install`
  fails on a clean checkout. `react-dom` is only used by the web target we do not
  ship.
- **`/ios` and `/android` are gitignored.** They are generated by `expo prebuild`
  from `app.json` and the config plugins. Never hand-edit them; the edit is lost
  on the next prebuild.
- **Push notifications do not exist yet**, on either end. The API has no device-token
  storage and no FCM/APNs credentials — notifications today are in-app and email.
  It is its own piece of work, in the API first.

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

## API dependencies

### 1. Native login — done in the API, not deployed yet

`buynextdoor-api` commit `28631d4` adds Sanctum's token half: the
`personal_access_tokens` migration, `HasApiTokens` on the User model, and a
`device_name` fork in `AuthController::login` — send it and you get a token,
omit it and you get the session cookie the web has always had. Logout revokes
only the calling device.

Sanctum, not Passport: Passport is an OAuth2 authorization server for delegating
access to third parties, and this is a first-party app. `auth:sanctum` already
accepts a bearer token, and `EnsureFrontendRequestsAreStateful` only goes
stateful when the request `Origin` matches `SANCTUM_STATEFUL_DOMAINS` — a native
client matches nothing and falls through to token auth. No routes changed and
the web is untouched.

Verified end to end against a local API: a `device_name` login returns a token,
the token authenticates `/me` with no cookie, logout 401s it, and a login
without `device_name` still carries no token.

**What is left: deploying that commit to staging**, which runs the migration.
Until then login here fails against `api.staging.buynextdoor.ph`.

One decision deliberately left open: `config/sanctum.php` has `'expiration' =>
null`, so tokens never expire. That is the usual Sanctum-on-mobile posture
(revocation rather than expiry, since Sanctum has no refresh tokens), but it
means a token on a lost phone is valid until someone revokes it. There is no
"sign out my other devices" UI yet.

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

|             |                                                                                                                                                                                                                           |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Working** | Login, forgot password, session restore + sign-out, auth guard, dashboard (all 14 metrics + SKU counter), navigation shell, **Orders** (filterable infinite list + detail with status changes, mark paid/complete/cancel) |
| **Stubbed** | The other 18 sections. Each is a real route that says so and points at the website, rather than a fake empty state                                                                                                        |

Ported sections replace the stub in place; nothing else has to move.

---

## Verify a screen against the real API before believing it

Two contract details on the orders endpoint were wrong in ways nothing would
have reported, and both were found by curling the API rather than reading the
web client:

- It answers `{ data, meta }`, **not** the `{ items, pagination }` the web
  client's comment claims. The wrong key yields an empty list, not an error.
- It filters on a scalar `status`. Sending `statuses[]` — the shape the web's
  `listQuery` defaults to — returns **every** row, unfiltered, with a 200.

So when porting a screen, check the response shape and the query spelling
against a live API, not against the TypeScript. A wrong guess renders a
plausible screen showing the wrong data.

```bash
TOKEN=$(curl -s -X POST "$API/login" -H 'Content-Type: application/json' \
  -d '{"email":"…","password":"…","device_name":"probe"}' | jq -r .data.token)
curl -s "$API/hubowner/customer/orders?per_page=2" -H "Authorization: Bearer $TOKEN" | jq
```

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

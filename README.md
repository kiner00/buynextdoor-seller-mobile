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

## Signing in

The auth screens match the web's: brand lockup, one elevated card, inline
validation, a password toggle, and the same links. Two things to know:

- **Google sign-in is wired but dormant.** The button appears only once
  `extra.google.{androidClientId,iosClientId}` in `app.json` (or the
  `EXPO_PUBLIC_GOOGLE_*_CLIENT_ID` env vars) hold real OAuth client IDs from the
  Google console, and the API's `GOOGLE_NATIVE_CLIENT_IDS` lists the same IDs.
  Google runs on the device and the API exchanges the ID token for a Sanctum
  token at `POST /google/native` — the web's redirect flow cannot serve a phone.
- **Registration is Google-only**, exactly as on the seller website. Until the
  client IDs exist, the register screen points at the website instead.

The Android client needs the app's signing SHA-1 (`eas credentials` prints it);
the iOS client needs the bundle id `ph.buynextdoor.seller`.

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

Every section of the seller web portal is ported. **All 22 entries in the More
menu and all five bottom tabs are real screens.** The single remaining
placeholder is _Inventory recovery_, which is a deliberate "Soon" on the web too.

| Section                                    | Notes                                                                                                                  |
| ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------- |
| Auth, Dashboard, Orders, Wallet, Catalogue | First batch; see earlier commits                                                                                       |
| Activated products                         | The catalogue filtered to what the seller carries                                                                      |
| Purchases                                  | What the seller bought from BND, read-only                                                                             |
| Inventory                                  | Stock + movements; tap a row to switch on-hand / dropship                                                              |
| Finance, Billing, Reports, Referrals       | Read-mostly. Referrals shares the link via the native share sheet                                                      |
| Trainings                                  | Tracks and lessons; opening a lesson marks it started                                                                  |
| Group orders                               | Procurement pools the seller has joined                                                                                |
| Storefront, Seller profile, Branches       | Forms. Images and documents stay on the website (they need `/upload` first)                                            |
| Copypaste posting                          | Pick a variant, **Share** to the native sheet or **Copy**                                                              |
| Scan QR                                    | Camera + manual entry; an `OR…` code opens the order, anything else searches the catalogue                             |
| Create order                               | Two steps — pick products, then the customer. Delivery requires an address                                             |
| Messages                                   | Inbox + thread. Polls every 5s as the floor; upgrades to Reverb websockets when the private-channel handshake succeeds |

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
  (Fixed on the web too, in `buynextdoor-fe` `0e8886c`.)

The wallet then produced three different shapes across one domain:

| Endpoint                       | Shape                         | Paginated?                                                                                             |
| ------------------------------ | ----------------------------- | ------------------------------------------------------------------------------------------------------ |
| `/hubowner/wallet`             | `{ balance, income_balance }` | n/a                                                                                                    |
| `/hubowner/wallet/ledgers`     | `{ items }`                   | **No** — `WalletService::ledgerFor` does `->limit($perPage)->get()`, so `page` is accepted and ignored |
| `/hubowner/wallet/topups`      | `{ data, meta }`              | Yes                                                                                                    |
| `/hubowner/wallet/withdrawals` | `{ data, meta }`              | Yes                                                                                                    |

The ledger one is why that screen is a capped "latest 50" list rather than an
infinite scroll: asking for page 2 returns page 1 again, so infinite scroll
would append the same rows forever.

So when porting a screen, check the response shape and the query spelling
against a live API, not against the TypeScript. A wrong guess renders a
plausible screen showing the wrong data.

A third way the API disagrees with the web client, found the same way — by
running the real controller against the staging database rather than reading
`hubCatalogue.ts`:

| `/hubowner/catalogue` | Web client expects                  | Laravel actually sends |
| --------------------- | ----------------------------------- | ---------------------- |
| product name          | `productDescription.name`           | `name`                 |
| category              | `category.categoryDescription.name` | `category` (a string)  |
| BND stock             | `productInventory.qty`              | `bnd_qty`              |
| price ladder          | `planPrices`                        | `plan_prices`          |
| activate body         | `{ activationType }`                | `{ activation_type }`  |

The first four degrade silently — a card titled with its SKU and an empty
ladder. The last one 422s, because the rule is `required`.

This batch was verified differently, and it was worth it: with an IAP tunnel to
the staging database, `php artisan tinker` in the app container can drive real
HTTP requests through the Laravel kernel as a signed-in seller — exact JSON, no
writes, no credentials needed. The recipe is in the project memory. It found:

- `/hubowner/reports/*` take **`start_date` / `end_date`**. The camelCase the web
  client sends is a 422, not a silent drop.
- `/chat/conversations` and `/hubowner/wallet/ledgers` are bare `{ items }`
  with no meta; `/hubowner/branches` is `{ branches }`; `/hubowner/procurement-pools`
  is `{ pools }`; `/hubowner/trainings` is a bare array. `adaptPage` in
  `src/api/domains/shared.ts` tolerates all of them.
- `/broadcasting/auth` is registered with Laravel's default `web` middleware, so
  a bearer token cannot authorize a private channel yet. That is why Messages
  polls as its floor. The API fix is one line in `bootstrap/app.php` — but it
  touches CSRF handling, so it is flagged rather than made.

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
- **Push notifications** are wired end to end. `buynextdoor-api` `992ae54` adds a
  `push` channel to the existing notification pipeline (so all 20 event types
  gained it at once) plus `POST`/`DELETE /devices`; this app registers on
  sign-in, unregisters on sign-out, and routes a tapped notification to the
  order it is about. **Needs a staging deploy**, and needs FCM credentials in
  the Expo project before a production Android build will deliver.
- Delivery goes through **Expo's push service**, which fans out to FCM and APNs.
  That is why there is no APNs certificate or FCM key in either repo.

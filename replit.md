# Vigilink-SOS

Multilingual personal safety Progressive Web App (PWA) built with React 18 + TypeScript + Vite + Tailwind CSS. Supports 18 languages via react-i18next with auto-detection.

## Brand Identity
- **Logo**: Navy blue shield with chain links + "SOS" text, red accent for "SOS" in wordmark
- **Color Palette**: Light blue-gray background (`#edf1f7`), navy blue text (`#1a2e4a`), red SOS (`#c41e2a`), white cards
- **Theme**: Light mode — pale blue-gray backgrounds, white cards, navy blue text, red primary buttons (SOS), plan-specific overrides (PRO=dark metallic blue, Platinum=dark gold)
- **3D Buttons**: `btn-3d-red` (SOS), `btn-3d-green` (navy blue gradient), `btn-3d-blue`, `btn-3d-slate`, `btn-3d-gold`
- **Marketing site**: `public/site/` — light theme matching logo, navy footer
- **PWA Icons**: `public/icon-192.png`, `public/icon-512.png` — navy blue shield with chain links + SOS

## Features
- SOS alert triggers with GPS tracking (cached via watchPosition — no re-prompt after initial grant)
- Voice Trigger: COMPLETELY REMOVED — all code, hooks, i18n keys, types, and store state deleted
- Fake Screen: COMPLETELY REMOVED — replaced by PWA SOS Widget shortcut
- Audio Recording: COMPLETELY REMOVED — hook, store state, i18n keys deleted
- Scream/Cry AI Detection: COMPLETELY REMOVED — PlatinumConfig simplified, settings UI removed
- Secret countdown (Dead Man's Switch) with background persistence (Service Worker + localStorage absolute timestamps)
- Fake call timer with background persistence, Web Audio ringtone/vibration, configurable caller name/phone/delay (PRO/Platinum)
- Senior-friendly UI: min 18px fonts, high contrast, 3D buttons (CSS perspective + gradient + multi-layer box-shadow), large touch targets (py-5), explicit icons with text
- Emergency contact management (1 free / 5 PRO / 10 Platinum)
- Sponsor/invite system (Platinum tier)
- Guardian AI chat (OpenAI GPT-4o-mini streaming) — draggable floating button
- Subscription tiers: Free, PRO, Platinum
- PWA installable with offline queue support
- Service worker with cache-first strategy for offline use
- Emergency Numbers directory (40+ countries, all plans) — searchable, tap to call
- Medical Profile (PRO/Platinum) — blood type, allergies, medications, conditions
- Dynamic QR Code (PRO/Platinum) — points to unique server-hosted profile URL, auto-syncs data, downloadable HTML export
- Meeting Mode (PRO/Platinum) — record meeting details, included in SOS SMS
- Security Journal (PRO/Platinum) — log incidents with text, dates, photos
- Travel Mode (PRO/Platinum) — check-in system with morning/evening times
- SOS Widget Shortcut (all plans) — PWA manifest shortcut, long-press app icon → "SOS" to send instant alert
- Earbuds SOS (PRO/Platinum) — triple media key press triggers SOS via Media Session API
- Volume Button SOS (PRO/Platinum) — triple press volume up/down triggers silent SOS with micro vibration
- Google Assistant SOS — "OK Google, lance l'alerte Vigilink" opens app via deep link and auto-triggers SOS with 2s GPS delay
- Sponsorship limited to 3 invites (Platinum)
- Alzheimer Sponsorship (PRO/Platinum) — manage up to 2 Alzheimer patients remotely, edit their QR code profiles, add custom instructions for finders, sync medical info to server

## Architecture
- **Frontend**: React 18, TypeScript, Vite 5 on port 5000, Tailwind CSS
- **Backend**: Express on port 3001 (started alongside Vite via `npm run dev`)
- **Proxy**: Vite proxies `/api/*` to backend on port 3001
- **State**: Zustand (persisted with localStorage)
- **Animations**: Framer Motion
- **Icons**: Lucide React

## Backend Endpoints (server/index.ts, port 3001)
- `GET /api/health` — Health check
- `POST /api/emergency` — Send Twilio SMS to emergency contacts (1st SMS immediate), accepts `lang` for multilingual messages (fr/en/es/ar/de/pt)
- `POST /api/upload-evidence` — Upload audio evidence file (multer, max 50MB)
- `POST /api/emergency-followup` — Send follow-up SMS with audio evidence after 30s recording (2nd SMS), accepts `lang` for multilingual messages
- `GET /evidence/*` — Static serving of uploaded evidence files
- `POST /api/chat` — OpenAI GPT-4o-mini streaming chat (SSE)
- `GET /api/profile/:id` — Fetch public profile data by profileId (for remote editing of Alzheimer ward profiles)
- `POST /api/checkout` — Stripe Checkout session (PRO or Platinum), accepts `currency` (cad/usd/eur), `native` (bool for APK), adds TPS+TVQ tax lines for CAD
- `POST /api/checkout/trial` — Stripe Checkout trial session, accepts `currency`, `native`, adds TPS+TVQ for CAD
- `POST /api/checkout/verify-session` — Verify Stripe session payment status (for native APK flow), accepts `sessionId`
- `GET /checkout/return` — Checkout return page for native APK (shown after Stripe payment in in-app browser)
- `POST /api/recovery/send-code` — Password recovery: sends 6-digit OTP via Twilio SMS, accepts `phone` and `lang` (fr/en/es/ar/pt/de)
- `POST /api/recovery/verify-code` — Password recovery: verifies OTP code, accepts `phone` and `code`
- `POST /api/admin/send-code` — Admin 2FA: generates 6-digit code, sends via Twilio SMS
- `POST /api/admin/verify-code` — Admin 2FA: verifies code, sends confirmation SMS on success
- `POST /api/otp/create` — Store OTP invitation on server (for cross-device guest validation)
- `POST /api/otp/validate` — Validate OTP code from any device (server-side), returns sponsorPhone/sponsorName
- `POST /api/checkout/restore` — Restore purchase: lists recent paid Stripe sessions for a userId, returns plan if found
- `POST /api/sponsor/send-invite` — Send invitation SMS to guest via Twilio
- `POST /api/sponsor/deactivate` — Send deactivation SMS to guest, remove access
- `POST /api/sync/save` — Save user profile to PostgreSQL (upsert by phone)
- `POST /api/sync/load` — Load user profile from PostgreSQL by phone number

## Admin Login (2FA) — Session-Based
- Admin button on LoginView → 3-field form (phone, email, password) → inline credential check
- After credentials verified: server sends 6-digit SMS code to admin phone (+14383678183)
- User enters code → server verifies → confirmation SMS sent → access granted
- Admin credentials: phone `4383678183`, email `izmaghiles@gmail.com`, password `123456789`
- Every login attempt sends an SMS notification; successful login sends a confirmation SMS
- Codes expire after 5 minutes; stored in server memory (Map)
- **Admin vs User separation**: `adminSession` boolean in useAppStore (NOT persisted) distinguishes admin login from user login
  - Admin panel login → `adminSession=true`, all features unlocked (platinum-level access), AdminView accessible
  - Normal login → `adminSession=false`, subscription determines access (default: free for admin phone too)
  - On page reload, `adminSession` resets to `false`; must re-login via admin panel for admin access
  - AdminView is guarded: renders `null` if `adminSession` is false; useEffect redirects to home
  - COMPTE_GILLES default subscription is `'free'` (not platinum); admin panel sets appStore user to platinum temporarily
  - All admin privilege checks use `adminSession` flag instead of phone number comparison

## APK / Capacitor
- All API calls use `apiUrl()` from `src/lib/apiBase.ts` — resolves to `VITE_API_URL` env var or defaults to `https://vigilink-sos.replit.app` on native platforms
- Set `VITE_API_URL` at build time to point to your deployed backend
- CORS is already configured (`origin: true`) on Express to accept requests from APK origin
- Capacitor config: `capacitor.config.ts` with `androidScheme: 'https'`, `hostname: 'vigilinksos.app'`
- Android Intent SOS: Capacitor `App.getLaunchUrl()` + `appUrlOpen` listener detects deep links, PWA detects `#sos` hash / `?action=sos` / localStorage `vigilink-pending-action`; triggers `sendEmergencySMS('assistant_sos')` with 1.5s delay. Unified handler re-checks on visibilitychange/focus/pageshow events + SW PENDING_ACTION message relay. 10s dedup guard prevents duplicate sends.
- Custom `MainActivity.java` in `android-config/` — detects Google Assistant launch via referrer/callingPackage, auto-injects `?action=sos`, shows over lock screen (setShowWhenLocked/setTurnScreenOn/WakeLock/requestDismissKeyguard)
- Android permissions: WAKE_LOCK, DISABLE_KEYGUARD, SYSTEM_ALERT_WINDOW, USE_FULL_SCREEN_INTENT
- Google Assistant App Actions: config files in `android-config/` — `res/xml/shortcuts.xml` (capability + shortcut), `res/values/strings.xml`, `AndroidManifest.xml.patch` (intent filters + meta-data + setup instructions + Routine workaround)
- Native SMS plugin: `src/plugins/NativeSMS.ts` (Capacitor bridge)

## Integrations (Replit Connectors)
- **Stripe**: `conn_stripe_01KJRN9BY0E505Z3F4P9TFXRBB` — payments via `server/stripeClient.ts`
- **Twilio**: `conn_twilio_01KJRQCQWH9ENM0GV4J02YHC2V` — SMS via `server/twilioClient.ts`
- **OpenAI**: AI Integrations blueprint — `AI_INTEGRATIONS_OPENAI_API_KEY` / `AI_INTEGRATIONS_OPENAI_BASE_URL`

## Project Structure
```
server/
├── index.ts            # Express API server (port 3001)
├── stripeClient.ts     # Stripe connector (Replit integration)
└── twilioClient.ts     # Twilio connector (Replit integration)
src/
├── App.tsx              # Root component, auth guard, SOS dispatch, motion detection
├── main.tsx             # React DOM entry point
├── index.css            # Tailwind + CSS variables (navy blue + red theme)
├── types.ts             # All TypeScript types and defaults
├── store/
│   ├── useAppStore.ts   # App state (GPS, alerts, contacts, views)
│   └── useAuthStore.ts  # Auth state (accounts, login, sponsor codes)
├── hooks/
│   ├── useAdaptiveGPS.ts
│   ├── useHaptics.ts
│   ├── useNetworkMonitor.ts
│   ├── useOfflineQueue.ts
│   ├── usePermissions.ts
│   ├── usePlanTheme.ts
│   ├── usePushNotifications.ts
│   └── useSecretCountdown.ts
├── lib/
│   ├── api.ts           # Frontend API client (fetch calls to /api/*)
│   ├── backgroundTimer.ts # Background timer persistence (localStorage + Service Worker sync)
│   ├── dateLocale.ts    # i18n-aware date formatting (date-fns + Intl locale mapping)
│   ├── pwa.ts           # PWA install prompt + service worker registration
│   └── stripe.ts        # Stripe checkout (calls /api/checkout)
├── components/
│   ├── AlertOverlay.tsx
│   ├── BottomNav.tsx
│   ├── CheckoutErrorBanner.tsx
│   ├── DevPlanSwitcher.tsx
│   ├── DuressKeypad.tsx
│   ├── GuardianChat.tsx   # AI chat using /api/chat (SSE streaming)
│   ├── NetworkStatusBar.tsx
│   ├── PhoneField.tsx    # Phone input with country selector (115 countries)
│   ├── PWAInstallBanner.tsx
│   ├── SecretCountdown.tsx
│   ├── SecurePinField.tsx
│   └── views/
│       ├── AdminView.tsx
│       ├── ChecklistView.tsx
│       ├── ContactsView.tsx
│       ├── HistoryView.tsx
│       ├── HomeView.tsx
│       ├── LegalView.tsx
│       ├── LoginView.tsx
│       ├── OnboardingView.tsx
│       ├── SettingsView.tsx
│       ├── SponsorView.tsx
│       ├── SupportView.tsx
│       └── UpgradeView.tsx
```

## Sponsor/Invitation System
- Platinum sponsors can invite up to 10 people via OTP codes (unique 6-digit, 15 min validity)
- Invitations keyed by unique ID (`sponsorPhone_guestPhone_timestamp`) in `otpInvitations` store
- Invited guests get **PRO** plan (not Platinum), with `isOtpGuest: true` flag
- If an OTP guest logs out, their account is **deleted** from `comptes` — they need a new code to reconnect
- SponsorView flow: enter phone → generate OTP → share via SMS/WhatsApp/copy → "New invitation" button → repeat
- Sent invitations list with status indicators (green=activated, yellow=pending, gray=expired)

## PWA SOS Widget Shortcut
- Long-press the app icon on home screen → "SOS Urgence" shortcut appears
- Launches app with `/?action=sos` → auto-triggers emergency SMS after 1.5s
- Also includes "Numéros d'urgence" shortcut → opens emergency numbers directory
- Works on Android (Chrome), iOS (Safari 16.4+), and desktop PWA
- Defined in `public/manifest.json` → `shortcuts` array

## PlatinumConfig Canonical Fields
Fields (in types.ts): `chuteActif`, `secoussesActif`, `modeDiscret`

## Test Account
- Phone: `+14383678183` (or `4383678183`)
- Password: `123456789`
- Plan: Platinum (user: Gilles)

## Running
```bash
npm run dev        # Starts Express backend (port 3001) + Vite frontend (port 5000)
npm run dev:server # Express backend only
npm run dev:client # Vite frontend only
```

## Configuration
- `tsconfig.json` — TypeScript configuration (strict: false for compatibility)
- `tailwind.config.ts` — Tailwind CSS with custom dark theme colors
- `vite.config.ts` — Vite dev server on 0.0.0.0:5000, proxy /api to port 3001

## i18n (react-i18next)
- 18 languages supported, locale files in `src/i18n/locales/*.json`
- All UI components use `t()` from `useTranslation()` — no hardcoded French fallback strings
- Language picker in SettingsView, initial language selection on first visit (LanguageSelector)
- i18n config: `src/i18n/config.ts`, language definitions: `src/i18n/languages.ts`
- ErrorBoundary in App.tsx catches crashes and shows English error message (outside i18n context)

## APK / Android Deployment (TWA)
- App is PWA-ready for TWA (Trusted Web Activity) wrapping
- `public/manifest.json` — Full PWA manifest with maskable + any icons
- `public/.well-known/assetlinks.json` — Digital Asset Links (update SHA256 fingerprint with signing key)
- `twa-manifest.json` — Bubblewrap CLI config (package: `com.vigilink.sos`)
- `scripts/build-apk.sh` — Automated build script (requires Java + Android SDK)
- `APK_BUILD_GUIDE.md` — Full guide with PWABuilder + Bubblewrap methods
- `server/index.ts` serves dotfiles (`.well-known`) via `express.static({ dotfiles: 'allow' })`
- Settings accordion: collapsible sections for a lighter mobile UX

## Cloud Profile Sync (PostgreSQL)
- **Database**: Replit PostgreSQL (`user_profiles` table) — stores profile data by phone number
- **Endpoints**: `POST /api/sync/save` (upsert profile), `POST /api/sync/load` (fetch profile by phone)
- **Sync utility**: `src/lib/profileSync.ts` — `saveProfileToServer()`, `loadProfileFromServer()`
- **Auto-sync**: `useAuthStore` subscribes to account changes and debounces (2s) saves to server
- **Login flow**: After local auth, loads server profile and merges (server wins for subscription, contacts, settings)
- **New device login**: If account not found locally but exists on server, creates local account and restores full profile
- **Register flow**: Checks server for existing profile (cross-device), merges if found, saves to server if new
- **Synced fields**: profileName, subscription, trialExpiresAt, contacts, platinumConfig, normalCode, duressCode, proPhone1/2, sponsorRole/Link/Codes

## Notes
- Auth stored client-side (Zustand persist/localStorage), profile synced to PostgreSQL server for cross-device access
- Zero TypeScript errors
- Component prop naming uses French conventions (e.g., `onAlertTriggered`, `actif`, `seuilDecibels`)
- SMS fallback (offline/native) now includes meeting mode data (medical profile removed from SMS for simplicity)
- Stealth triggers (volume, earbuds) always use micro vibration even when discreet mode is off
- Fall detection uses 300ms window (was 80ms) with shared debounce to prevent double triggers
- iOS DeviceMotion permission is requested on first user gesture (click/touch) for fall/shake detection
- Plan comparison tables updated: removed voice/AI detection, added Widget SOS, medical, fall, shake, discreet mode
- SW cache: `vigilinksos-v21`
- In-app update banner: `UpdateBanner` component checks server version via `/api/health` every 5 min + listens for SW `pwa-update-available` event; shows blue banner with "Update now" / "Later" buttons; clears caches and reloads on update
- Medical profile, meeting mode, journal entries, and travel mode now persist in localStorage (added to Zustand partialize)
- Emergency profile page: server stores alert data and generates a link (valid 24h) included in every SMS
- Endpoint: `GET /emergency-profile/:id` — renders HTML page with all emergency data (medical, meeting, GPS, contacts)
- SMS routing: Free plan uses native phone messaging (1 contact), PRO/Platinum use Twilio (multi-contacts), fallback to native SMS (1st contact) if offline
- Onboarding simplified: 3 steps (contact → setup → legal), profile step removed (collected at registration)
- Dynamic QR Code: Points to `https://vigilink-sos.replit.app/profile/{profileId}` — unique 12-char ID per user, persists across sessions
- Alzheimer Mode (PRO/Platinum): Simplified profile page when QR is scanned — large call button for caregiver, GPS position sharing via SMS, medical info only, privacy controls hide address
- Public profile endpoints: `POST /api/profile/save`, `GET /profile/:id`, `POST /api/profile/send-location`
- Public profiles stored in-memory Map (persistent during server lifetime, not 24h expiry like emergency profiles)

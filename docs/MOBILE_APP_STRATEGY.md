# Mobile App Strategy

> Planning document -- evaluating paths from the current React 18 / GitHub Pages web app
> to a production-quality mobile experience.
>
> Last updated: 2026-03-01

---

## Current State

| Dimension | Status |
|-----------|--------|
| Framework | React 18 (CRA, `react-scripts`) |
| Hosting | GitHub Pages (static, CDN-cached) |
| Backend | Supabase (PostgreSQL + Auth + RLS + Realtime) |
| Routing | Hash-based (`window.location.hash`), no React Router |
| PWA manifest | `public/manifest.json` -- `standalone`, portrait, Georgetown branding |
| Service worker | `public/service-worker.js` -- network-first with offline fallback to cache |
| Install prompt | Handled in `App.js` (`beforeinstallprompt`, banner, dismiss/persist) |
| Offline detection | `navigator.onLine` listener, top-banner warning |
| Native APIs used | None (no push notifications, camera, biometrics, etc.) |
| Component count | ~20 screens, all rendered via `screen` state string in `App.js` |
| Largest component | `CommissionerDashboard.js` (~1,700 lines) |
| Styling | Primarily React inline styles (intentional -- GitHub Pages CSS-cache workaround) |
| Dependencies | `recharts`, `papaparse`, `@sentry/react`, `@supabase/supabase-js` |

The app already behaves as a basic PWA on Android and desktop Chrome. iOS Safari support is limited (no install prompt API, no push without workarounds).

---

## Evaluation Criteria

Each approach is scored on five axes:

| Axis | What it measures |
|------|-----------------|
| **Effort** | Dev hours / complexity to reach feature parity with current web app |
| **Timeline** | Realistic calendar time for a solo or small-team dev |
| **UX** | Native feel, performance, access to device APIs |
| **Maintenance** | Ongoing cost of keeping web + mobile in sync |
| **Distribution** | App Store / Play Store presence, update mechanisms |

Scores: **Low / Medium / High** (for effort/maintenance, lower is better; for UX/distribution, higher is better).

---

## Option 1: Enhanced PWA

**What it is:** Keep the single React codebase, improve the existing PWA infrastructure to close the gap with native apps.

### What "enhanced" means concretely

- Replace the hand-rolled service worker with **Workbox** (precaching, runtime caching strategies, background sync)
- Add **Web Push Notifications** via Supabase Edge Functions + the Push API (works on Android and desktop; iOS 16.4+ with Safari)
- Implement **offline quiz mode**: cache a question batch in IndexedDB, sync results when back online
- Add a proper **app shell** architecture so the UI paints instantly from cache
- Use **TWA (Trusted Web Activity)** or **PWABuilder** to publish to the Google Play Store as a wrapper
- Improve iOS experience: splash screens, `apple-touch-icon`, `apple-mobile-web-app-capable` meta tags

### Scorecard

| Axis | Score | Notes |
|------|-------|-------|
| Effort | **Low** | Incremental improvements to existing codebase. No new framework, no new build pipeline. ~40-80 hours. |
| Timeline | **2-4 weeks** | Can be shipped incrementally -- each improvement is independently deployable. |
| UX | **Medium** | Smooth on Android/desktop. iOS still has gaps: no badge counts, limited background sync, 50 MB storage cap. Feels "almost native" but power users notice. |
| Maintenance | **Low** | Single codebase. No platform-specific code. CI/CD stays as-is (`npm run build && npm run deploy`). |
| Distribution | **Medium** | Google Play via TWA (real listing, ratings, reviews). Apple App Store not possible without a native wrapper. Sideloading via "Add to Home Screen" on all platforms. |

### Risks

- Apple could further restrict or stall PWA capabilities (they have historically been slow to adopt)
- No App Store presence on iOS means lower discoverability for iPhone users
- Web Push on iOS requires the user to "Add to Home Screen" first -- extra friction

---

## Option 2: React Native (New Codebase)

**What it is:** Rewrite the UI layer in React Native, sharing the Supabase client logic and business logic where possible.

### What it involves

- New React Native project (likely via the React Native CLI or a framework like Expo -- see Option 4)
- Rewrite all ~20 screens using React Native components (`View`, `Text`, `ScrollView`, etc.) -- no DOM, no CSS
- Replace `recharts` with a React Native charting lib (e.g., `react-native-gifted-charts` or `victory-native`)
- Replace inline styles with `StyleSheet.create()` equivalents
- Implement native navigation (`@react-navigation/native`) to replace hash routing
- Supabase JS client works unchanged in React Native
- Separate build/deploy pipelines for iOS and Android

### Scorecard

| Axis | Score | Notes |
|------|-------|-------|
| Effort | **High** | Full UI rewrite. Every screen, every style, every interaction. Recharts and PapaParse need replacements. Estimate 300-500+ hours. |
| Timeline | **3-6 months** | For a solo dev maintaining the web app in parallel. Could overlap but context-switching is costly. |
| UX | **High** | True native navigation, gestures, animations. Access to all device APIs (push, biometrics, haptics, camera). Best possible performance. |
| Maintenance | **High** | Two separate codebases (web + RN) that must stay in sync. Every feature ships twice. Xcode + Android Studio toolchains. Native dependency upgrades. |
| Distribution | **High** | Full App Store and Play Store listings. Native update mechanisms. TestFlight for beta. |

### Risks

- Maintaining two codebases as a solo/small team is the #1 risk -- feature drift is almost guaranteed
- React Native upgrade cycles can be painful (native module compatibility)
- The web app on GitHub Pages would still need to exist for the embed widget and casual browser users
- `CommissionerDashboard.js` at 1,700 lines is already complex -- porting it without regressions is significant work

---

## Option 3: Capacitor Wrapper

**What it is:** Use [Capacitor](https://capacitorjs.com/) (by Ionic) to wrap the existing React web app in a native WebView shell, adding native plugins as needed.

### What it involves

- `npm install @capacitor/core @capacitor/cli` + `npx cap init`
- Point Capacitor at the existing `build/` output
- Add platforms: `npx cap add ios && npx cap add android`
- Swap `window.location.hash` routing for something Capacitor-friendly (hash routing actually works fine in WebView)
- Add Capacitor plugins for: push notifications (`@capacitor/push-notifications`), splash screen, status bar, app updates
- Build native shells in Xcode / Android Studio
- Publish to both stores

### Scorecard

| Axis | Score | Notes |
|------|-------|-------|
| Effort | **Low-Medium** | The existing React app runs as-is inside the WebView. Native plugin integration for push, splash, etc. takes ~60-120 hours. No UI rewrite. |
| Timeline | **3-6 weeks** | Initial wrapper in days. Plugin integration and store submission take the bulk of time. |
| UX | **Medium** | It's still a WebView -- scrolling, animations, and transitions won't feel fully native. But push notifications, splash screens, and deep links work natively. Performance is good for content-driven apps like trivia. |
| Maintenance | **Medium** | Single web codebase + thin native shells. Capacitor plugins need occasional updates. Xcode/Android Studio required for builds, but most changes are web-only deploys. |
| Distribution | **High** | Real App Store and Play Store listings. Standard native update flow. Can also use Capgo/Appflow for OTA web-layer updates without store review. |

### Risks

- WebView performance on older Android devices can be sluggish
- Some UI patterns (pull-to-refresh, native tab bars, swipe-back) require extra work to feel right
- Apple has occasionally scrutinized "thin wrapper" apps -- the app needs enough native integration to justify store presence
- Inline styles (used heavily in this project) render fine in WebView, so no migration needed there

---

## Option 4: Expo (Managed React Native)

**What it is:** Use [Expo](https://expo.dev/) to build a React Native app with managed infrastructure -- no Xcode/Android Studio required for most workflows.

### What it involves

- New Expo project (`npx create-expo-app`)
- Same UI rewrite as Option 2 (React Native components, no DOM)
- BUT: Expo provides managed build service (EAS Build), OTA updates (EAS Update), push notification service, and a rich plugin ecosystem
- Supabase works out of the box with Expo
- Expo Router for file-based navigation

### Scorecard

| Axis | Score | Notes |
|------|-------|-------|
| Effort | **High** | Same full UI rewrite as React Native. Expo reduces toolchain pain but not the porting work. ~250-450 hours. |
| Timeline | **2.5-5 months** | Slightly faster than bare React Native due to EAS Build and managed workflow. No Xcode/Android Studio setup time. |
| UX | **High** | Same native UX quality as React Native. Expo adds good defaults (splash handling, asset optimization, gesture handler). |
| Maintenance | **Medium-High** | Still two codebases (web + Expo). But Expo's managed updates (EAS Update) reduce deploy friction. Expo SDK upgrades are smoother than bare RN. Expo also supports web target, potentially allowing a single codebase for all platforms (but with significant migration effort from CRA). |
| Distribution | **High** | EAS Build handles signing and submission. TestFlight + Play Store with minimal manual steps. OTA updates for JS-only changes without store review. |

### Risks

- Same codebase duplication problem as Option 2 unless you go all-in on Expo for web too (which means migrating off CRA and GitHub Pages)
- Expo's "web" target is production-ready but the ecosystem is native-first; some web-specific patterns may feel awkward
- Going all-in on Expo (native + web) is architecturally clean but is effectively a full rewrite of the entire app -- highest total effort of any option

---

## Comparison Matrix

| | Enhanced PWA | React Native | Capacitor | Expo |
|---|---|---|---|---|
| **Effort** | Low (~60 hrs) | High (~400 hrs) | Low-Med (~90 hrs) | High (~350 hrs) |
| **Timeline** | 2-4 weeks | 3-6 months | 3-6 weeks | 2.5-5 months |
| **UX quality** | Medium | High | Medium | High |
| **Maintenance burden** | Low | High | Medium | Medium-High |
| **App Store (iOS)** | No | Yes | Yes | Yes |
| **Play Store** | Yes (TWA) | Yes | Yes | Yes |
| **Push notifications** | Partial (no iOS badge) | Full | Full | Full |
| **Offline support** | Good (IndexedDB + SW) | Good (AsyncStorage) | Good (same as PWA) | Good (AsyncStorage) |
| **Codebase count** | 1 | 2 | 1 + native shells | 2 (or 1 if all-in) |
| **Requires Xcode** | No | Yes | Yes | No (EAS Build) |

---

## Recommendation: Capacitor Wrapper

**Capacitor is the right choice for this project, right now.** Here's why:

### 1. Maximum leverage on existing code

The entire React 18 app -- all 20 screens, all inline styles, all Supabase integration -- runs unmodified inside Capacitor's WebView. There is zero UI rewrite. The `CommissionerDashboard.js` and every other component work as-is.

### 2. App Store presence with minimal effort

The biggest gap in the current PWA approach is iOS App Store distribution. Capacitor closes that gap in weeks, not months. Apple users can discover and install the app normally.

### 3. Native capabilities where they matter

Push notifications (the #1 requested mobile feature for community trivia) work natively through Capacitor plugins. Splash screens, status bar theming, and deep links come essentially for free.

### 4. Low maintenance overhead

Day-to-day development stays web-only: `npm start`, edit React components, test in browser. The native shells only need attention for plugin updates or store submissions. This is critical for a solo/small team.

### 5. Clear upgrade path

If the app outgrows the WebView UX ceiling (e.g., needs complex gestures, 60fps animations, heavy native integration), Capacitor screens can be incrementally replaced with native views, or the project can migrate to Expo. Capacitor doesn't lock you in.

### Why not the others?

- **Enhanced PWA** is the lowest effort but doesn't solve the iOS App Store gap. It should still be done _alongside_ Capacitor (the improvements benefit the WebView too).
- **React Native / Expo** are the right choice if you're building a mobile-first product from scratch. But rewriting 20 screens and maintaining two codebases is disproportionate to the current need. The trivia app is content-driven (text, buttons, charts) -- it doesn't need native gesture physics or complex animations.

### Suggested phasing

| Phase | Work | Timeline |
|-------|------|----------|
| **Phase 0** | Enhanced PWA improvements (Workbox, app shell, iOS meta tags). Benefits all users immediately. | 2 weeks |
| **Phase 1** | Capacitor init, Android build, Play Store submission. | 1 week |
| **Phase 2** | Capacitor iOS build, push notifications plugin, App Store submission. | 2-3 weeks |
| **Phase 3** | Native polish: splash screen, status bar, deep links, OTA updates via Capgo. | 1-2 weeks |
| **Total** | | **6-8 weeks** |

---

## Appendix: Key Compatibility Notes

**Hash routing:** Capacitor's WebView handles `window.location.hash` routing without issues. No migration to React Router is required (though it would be a nice cleanup if time permits).

**Inline styles:** The project uses React inline styles extensively (per CLAUDE.md, to avoid GitHub Pages CSS caching issues). These render identically in a WebView. No changes needed.

**Supabase client:** `@supabase/supabase-js` works in any JS environment. The existing `supabaseClient.js` singleton needs no changes for Capacitor.

**Recharts:** SVG-based charts render fine in WebView. Performance is acceptable for the dashboard-level data volumes in this app.

**Service worker:** The existing service worker will still function inside Capacitor's WebView on Android. On iOS WKWebView, service workers are supported but have quirks -- testing needed.

**Sentry:** `@sentry/react` works in WebView. For native crash reporting, add `@sentry/capacitor`.

**Embed widget (`quiz-embed`):** The embed is a separate project and is unaffected by any mobile strategy. It will continue to work as a web component regardless of which path is chosen for the main app.

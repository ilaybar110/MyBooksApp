# Daily Highlights Carousel + Push Notification — Design Spec

**Date:** 2026-04-18
**Goal:** Surface book quotes passively — a daily 10 AM push notification opens the app to a swipeable carousel of 5 daily highlights, so the user never has to manually hunt for motivation.

---

## 1. Daily Highlights Carousel

### Selection Logic
- Each day, pick **5 highlights** from the user's collection
- Prefer favorites (`isFavorite: true`); fall back to all highlights if fewer than 5 favorites exist
- Selection is **date-seeded**: same 5 quotes show all day, refresh at midnight
- Stored in `localStorage` as `{ date: "YYYY-MM-DD", ids: ["id1", ..., "id5"] }`
- If fewer than 5 highlights exist total, show however many are available

### Component: `DailyCarousel`
- New file: `frontend/src/components/DailyCarousel.jsx`
- Replaces the existing static "Highlight of the Day" card in `LibraryPage.jsx`
- Receives `highlights` (array of up to 5) and `books` (for book title lookup) as props

### Visual Design
- Font size: **18px** (up from current 14px)
- Horizontal scroll with **CSS `scroll-snap`** — no JS library, snaps cleanly between cards
- Each card is full-width of the container (one quote visible at a time)
- **Dot indicators** below the cards: filled dot = current card (e.g. ●○○○○)
- Each card shows:
  - Quote text (18px, line-height 1.7, respects RTL for Hebrew)
  - Book title as a tappable link → navigates to `book-detail`
- Header label "Highlights of the Day" stays the same style (gold, uppercase, 10px)
- Container and card styling matches existing gold accent theme (`rgba(196,147,58,...)`)

### Dot Indicator Behavior
- Dots update as user scrolls (via `IntersectionObserver` or scroll event on the container ref)
- Tapping a dot jumps to that card

---

## 2. Push Notification System

### User Flow
```
First open after feature ships
→ App registers Service Worker
→ Browser asks "Allow notifications?"
→ User taps Allow
→ Frontend POSTs push subscription to backend → stored in db.json

Every day at 10:00 AM (server time)
→ node-cron fires
→ Backend sends Web Push to all stored subscriptions
→ Notification: "📖 Highlights of the Day" / "Tap to see today's quotes"

User taps notification
→ App opens (or comes to foreground)
→ Library page shown with carousel visible at top
```

### New Backend Files / Changes

**`backend/server.js` additions:**
- `POST /api/push/subscribe` — receives a push subscription object from the frontend, stores it in `db.json` under `pushSubscriptions: []`. Deduplicates by `subscription.endpoint`.
- `POST /api/push/test` — sends an immediate test push to all subscriptions (for development/debugging only)
- `node-cron` job: runs daily at `0 10 * * *` (10:00 AM server time), calls internal `sendDailyPush()` function
- `sendDailyPush()`: iterates all stored subscriptions, sends Web Push via `web-push` library, removes any expired/invalid subscriptions automatically

**New packages (backend):**
- `web-push` — handles VAPID signing and push delivery
- `node-cron` — cron scheduler

**VAPID keys:**
- Generated once via `npx web-push generate-vapid-keys`
- Stored in `backend/.env`:
  ```
  VAPID_PUBLIC_KEY=...
  VAPID_PRIVATE_KEY=...
  VAPID_SUBJECT=mailto:your@email.com
  ```
- Public key exposed via `GET /api/push/vapid-public-key` so the frontend can subscribe

### New Frontend Files / Changes

**`frontend/public/sw.js` — Service Worker:**
- Listens for `push` events → calls `self.registration.showNotification()`
- Notification title: "📖 Highlights of the Day"
- Notification body: "Tap to see today's quotes"
- Notification icon: app icon (if available)
- Listens for `notificationclick` → `clients.openWindow('/')` to open/focus the app

**`frontend/src/utils/notifications.js` — new utility:**
- `registerServiceWorker()` — registers `sw.js`
- `subscribeToPush(vapidPublicKey)` — calls `registration.pushManager.subscribe()`, returns subscription
- `savePushSubscription(subscription)` — POSTs subscription to `POST /api/push/subscribe`
- `initPushNotifications()` — orchestrates the above; called once on app mount in `App.jsx`

**`frontend/src/App.jsx` change:**
- Call `initPushNotifications()` in a `useEffect` on mount (runs once, silently handles errors)

### Notification Permission Handling
- If the user denies permission: silently do nothing, no error shown
- If the user grants permission: subscribe and save, show no UI feedback (happens silently in background)
- If already subscribed (returning visit): skip re-subscription silently

---

## 3. Data Shape Changes

**`db.json` additions:**
```json
{
  "pushSubscriptions": [
    {
      "endpoint": "https://fcm.googleapis.com/...",
      "keys": { "p256dh": "...", "auth": "..." }
    }
  ]
}
```

No changes to highlights or books data shape.

---

## 4. Files Touched

| File | Change |
|------|--------|
| `frontend/src/components/DailyCarousel.jsx` | **New** — carousel component |
| `frontend/src/pages/LibraryPage.jsx` | Replace static HOTD card with `<DailyCarousel>` |
| `frontend/src/utils/notifications.js` | **New** — push subscription utilities |
| `frontend/src/App.jsx` | Add `initPushNotifications()` on mount |
| `frontend/public/sw.js` | **New** — service worker |
| `backend/server.js` | Add push endpoints + cron job |
| `backend/package.json` | Add `web-push`, `node-cron` |
| `backend/.env` | Add VAPID keys (manual step) |

---

## 5. Out of Scope
- Rating or reviewing highlights
- Spaced repetition
- Customizable notification time (hardcoded 10 AM server time)
- Multiple notification subscriptions per user (single-user app)

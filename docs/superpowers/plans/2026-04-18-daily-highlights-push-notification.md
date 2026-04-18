# Daily Highlights Carousel + Push Notification — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the single "Highlight of the Day" card with a swipeable 5-quote carousel, and send a daily 10 AM push notification that taps straight into the app.

**Architecture:** A new `DailyCarousel` component owns all carousel UI; selection logic lives in `LibraryPage`. Push notification plumbing is split between a Service Worker (`sw.js`), a frontend utility (`notifications.js`), and two new backend endpoints + a cron job in `server.js`.

**Tech Stack:** React 18, CSS scroll-snap (no library), Web Push API, `web-push` npm package, `node-cron` npm package, Express.

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `frontend/src/components/DailyCarousel.jsx` | **Create** | Swipeable carousel UI with dots |
| `frontend/src/pages/LibraryPage.jsx` | **Modify** | Swap hotd logic (1→5 picks), use DailyCarousel |
| `frontend/public/sw.js` | **Create** | Service Worker: receive push, show notification, handle tap |
| `frontend/src/utils/notifications.js` | **Create** | Register SW, request permission, subscribe, POST to backend |
| `frontend/src/App.jsx` | **Modify** | Call `initPushNotifications()` on mount |
| `backend/server.js` | **Modify** | VAPID setup, push endpoints, cron job |
| `backend/package.json` | **Modify** | Add `web-push`, `node-cron` |
| `backend/.env` | **Create** | VAPID keys + subject (manual step, never committed) |

---

## Task 1: `DailyCarousel` component

**Files:**
- Create: `frontend/src/components/DailyCarousel.jsx`

- [ ] **Step 1: Create the file with the complete component**

```jsx
// frontend/src/components/DailyCarousel.jsx
import React, { useRef, useState, useEffect } from 'react';
import { isHebrew, getTextDirection } from '../utils/helpers.js';

export default function DailyCarousel({ highlights, books, navigate }) {
  const scrollRef = useRef(null);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const container = scrollRef.current;
    if (!container || !highlights.length) return;
    const cards = Array.from(container.children);
    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            setActiveIndex(cards.indexOf(entry.target));
          }
        });
      },
      { root: container, threshold: 0.6 }
    );
    cards.forEach(card => observer.observe(card));
    return () => observer.disconnect();
  }, [highlights]);

  const scrollToCard = (index) => {
    const container = scrollRef.current;
    if (!container) return;
    const card = container.children[index];
    if (card) card.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'start' });
  };

  if (!highlights.length) return null;

  return (
    <div style={{ marginBottom: '18px' }}>
      <p style={{ margin: '0 0 10px', fontSize: '10px', fontWeight: 700, color: '#C4933A', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
        Highlights of the Day
      </p>
      <div
        ref={scrollRef}
        style={{
          display: 'flex',
          overflowX: 'auto',
          scrollSnapType: 'x mandatory',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          borderRadius: '8px',
        }}
      >
        {highlights.map((h) => {
          const book = books.find(b => b.id === h.bookId);
          const hebrew = isHebrew(h.markedText);
          return (
            <div
              key={h.id}
              style={{
                flex: '0 0 100%',
                scrollSnapAlign: 'start',
                padding: '14px 16px',
                background: 'rgba(196,147,58,0.06)',
                borderLeft: '3px solid #C4933A',
                boxSizing: 'border-box',
              }}
            >
              <p style={{
                margin: '0 0 10px',
                fontSize: '18px',
                lineHeight: 1.7,
                color: 'var(--text-primary)',
                direction: getTextDirection(h.markedText),
                textAlign: hebrew ? 'right' : 'left',
                fontFamily: hebrew ? 'serif' : undefined,
              }}>
                {h.markedText}
              </p>
              {book && (
                <button
                  onClick={() => navigate('book-detail', { bookId: book.id })}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    cursor: 'pointer',
                    fontSize: '12px',
                    color: 'var(--accent-primary)',
                    fontFamily: 'DM Sans, sans-serif',
                    fontWeight: 500,
                  }}
                >
                  — {book.title}
                </button>
              )}
            </div>
          );
        })}
      </div>
      {highlights.length > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', marginTop: '10px' }}>
          {highlights.map((_, i) => (
            <button
              key={i}
              onClick={() => scrollToCard(i)}
              aria-label={`Go to highlight ${i + 1}`}
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                border: 'none',
                padding: 0,
                cursor: 'pointer',
                background: i === activeIndex ? '#C4933A' : 'rgba(196,147,58,0.3)',
                transition: 'background 150ms',
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/DailyCarousel.jsx
git commit -m "feat: add DailyCarousel component with scroll-snap and dot indicators"
```

---

## Task 2: Update `LibraryPage` — 5-pick selection + use DailyCarousel

**Files:**
- Modify: `frontend/src/pages/LibraryPage.jsx`

The current code picks 1 highlight and stores `{ date, id }` in `localStorage` under key `hotd`.
Replace with picking 5 highlights stored as `{ date, ids: [...] }` under key `hotd5`.

- [ ] **Step 1: Replace the import line at the top of LibraryPage**

Find this existing line:
```jsx
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
```
Add the DailyCarousel import directly after the existing imports block (after line 5):
```jsx
import DailyCarousel from '../components/DailyCarousel.jsx';
```

- [ ] **Step 2: Replace the `hotd` state declaration**

Find:
```jsx
  const [hotd, setHotd] = useState(null);
```
Replace with:
```jsx
  const [dailyHighlights, setDailyHighlights] = useState([]);
```

- [ ] **Step 3: Replace the hotd selection useEffect (lines 39–54)**

Find the entire block:
```jsx
  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    const stored = (() => { try { return JSON.parse(localStorage.getItem('hotd') || '{}'); } catch { return {}; } })();
    if (stored.date === today && stored.id) {
      const all = getHighlights();
      const found = all.find(h => h.id === stored.id);
      if (found) { setHotd(found); return; }
    }
    const all = getHighlights();
    if (!all.length) return;
    const favs = all.filter(h => h.isFavorite);
    const pool = favs.length ? favs : all;
    const picked = pool[Math.floor(Math.random() * pool.length)];
    localStorage.setItem('hotd', JSON.stringify({ date: today, id: picked.id }));
    setHotd(picked);
  }, []);
```
Replace with:
```jsx
  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    const stored = (() => { try { return JSON.parse(localStorage.getItem('hotd5') || '{}'); } catch { return {}; } })();
    const all = getHighlights();
    if (!all.length) return;

    if (stored.date === today && Array.isArray(stored.ids) && stored.ids.length) {
      const found = stored.ids.map(id => all.find(h => h.id === id)).filter(Boolean);
      if (found.length) { setDailyHighlights(found); return; }
    }

    const favs = all.filter(h => h.isFavorite);
    const pool = favs.length >= 5 ? favs : all;
    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    const picked = shuffled.slice(0, 5);
    localStorage.setItem('hotd5', JSON.stringify({ date: today, ids: picked.map(h => h.id) }));
    setDailyHighlights(picked);
  }, []);
```

- [ ] **Step 4: Replace the carousel render block in JSX**

Find the entire old card block:
```jsx
        {hotd && highlights.length > 0 && (
          <div
            onClick={() => navigate('highlights', { highlightId: hotd.id })}
            onMouseEnter={e => e.currentTarget.style.opacity = '0.8'}
            onMouseLeave={e => e.currentTarget.style.opacity = '1'}
            onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') navigate('highlights', { highlightId: hotd.id }); }}
            role="button"
            tabIndex={0}
            aria-label="View highlight of the day in highlights section"
            style={{ marginBottom: '18px', padding: '14px 16px', background: 'rgba(196,147,58,0.06)', borderLeft: '3px solid #C4933A', borderRadius: '8px', cursor: 'pointer', transition: 'opacity 150ms' }}
          >
            <p style={{ margin: '0 0 6px', fontSize: '10px', fontWeight: 700, color: '#C4933A', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Highlight of the Day</p>
            <p style={{ margin: '0 0 8px', fontSize: '14px', lineHeight: 1.65, color: 'var(--text-primary)', direction: getTextDirection(hotd.markedText), textAlign: isHebrew(hotd.markedText) ? 'right' : 'left', fontFamily: isHebrew(hotd.markedText) ? 'serif' : undefined }}>{hotd.markedText}</p>
            <span style={{ fontSize: '12px', color: 'var(--accent-primary)', fontFamily: 'DM Sans, sans-serif', fontWeight: 500 }}>
              {(() => { const b = books.find(x => x.id === hotd.bookId); return b ? `— ${b.title}` : ''; })()}
            </span>
          </div>
        )}
```
Replace with:
```jsx
        {dailyHighlights.length > 0 && (
          <DailyCarousel highlights={dailyHighlights} books={books} navigate={navigate} />
        )}
```

- [ ] **Step 5: Verify in browser**

Run `npm run dev` in the `frontend` folder. Open the app. The Library page should show the carousel with up to 5 quotes, swipeable left/right, with dot indicators. Font should be noticeably larger (18px vs old 14px).

- [ ] **Step 6: Commit**

```bash
git add frontend/src/pages/LibraryPage.jsx
git commit -m "feat: replace single hotd card with 5-quote DailyCarousel in LibraryPage"
```

---

## Task 3: Service Worker

**Files:**
- Create: `frontend/public/sw.js`

This file is served at `/sw.js` by Vite (anything in `public/` is served as-is). It handles incoming push events and notification clicks.

- [ ] **Step 1: Create the service worker file**

```js
// frontend/public/sw.js
self.addEventListener('push', event => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || '📖 Highlights of the Day';
  const options = {
    body: data.body || 'Tap to see today\'s quotes',
    tag: 'daily-highlights',
    renotify: true,
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      for (const client of clientList) {
        if ('focus' in client) return client.focus();
      }
      return clients.openWindow('/');
    })
  );
});
```

- [ ] **Step 2: Commit**

```bash
git add frontend/public/sw.js
git commit -m "feat: add service worker for push notifications"
```

---

## Task 4: Push notification utilities

**Files:**
- Create: `frontend/src/utils/notifications.js`

- [ ] **Step 1: Create the utilities file**

```js
// frontend/src/utils/notifications.js

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)));
}

async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return null;
  return navigator.serviceWorker.register('/sw.js');
}

async function subscribeToPush(registration, vapidPublicKey) {
  const existing = await registration.pushManager.getSubscription();
  if (existing) return existing;
  return registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
  });
}

async function savePushSubscription(subscription) {
  await fetch('/api/push/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(subscription),
  });
}

export async function initPushNotifications() {
  try {
    if (!('Notification' in window) || !('serviceWorker' in navigator)) return;
    const registration = await registerServiceWorker();
    if (!registration) return;
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return;
    const resp = await fetch('/api/push/vapid-public-key');
    if (!resp.ok) return;
    const { publicKey } = await resp.json();
    const subscription = await subscribeToPush(registration, publicKey);
    await savePushSubscription(subscription);
  } catch (e) {
    console.warn('Push notification setup failed:', e);
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/utils/notifications.js
git commit -m "feat: add push notification utilities (register SW, subscribe, save)"
```

---

## Task 5: Wire push init in `App.jsx`

**Files:**
- Modify: `frontend/src/App.jsx`

- [ ] **Step 1: Add the import for `initPushNotifications`**

Find the existing import line at the top of App.jsx:
```jsx
import React, { useState, useCallback } from 'react';
```
Replace with:
```jsx
import React, { useState, useCallback, useEffect } from 'react';
```

Then add a new import after the existing page imports (after line 7):
```jsx
import { initPushNotifications } from './utils/notifications.js';
```

- [ ] **Step 2: Add the `useEffect` inside the `App` component**

Find this line inside the `App` function (just before the `navigate` callback):
```jsx
  const navigate = useCallback((page, params = {}) => {
```
Insert directly before it:
```jsx
  useEffect(() => {
    initPushNotifications();
  }, []);

```

- [ ] **Step 3: Verify in browser**

Open the app. The browser should immediately ask "Allow notifications?" (first visit only). Check the browser console — it should show no errors. If it shows `Push notification setup failed` it means the backend push endpoints aren't deployed yet (that's fine at this stage — the error is caught and suppressed).

- [ ] **Step 4: Commit**

```bash
git add frontend/src/App.jsx
git commit -m "feat: init push notification subscription on app mount"
```

---

## Task 6: Backend — install packages and generate VAPID keys

**Files:**
- Modify: `backend/package.json` (via npm install)
- Create: `backend/.env` (manual step)

- [ ] **Step 1: Install the two new packages**

```bash
cd backend && npm install web-push node-cron
```

Expected: `package.json` now lists `web-push` and `node-cron` under `dependencies`.

- [ ] **Step 2: Generate VAPID keys**

```bash
cd backend && node -e "import('web-push').then(wp => { const keys = wp.default.generateVAPIDKeys(); console.log('VAPID_PUBLIC_KEY=' + keys.publicKey); console.log('VAPID_PRIVATE_KEY=' + keys.privateKey); })"
```

Copy the two lines of output.

- [ ] **Step 3: Create `backend/.env`**

Create the file `backend/.env` with this content (replace the placeholder values with the actual keys from Step 2, and replace the email with your real email):

```
ANTHROPIC_API_KEY=your_existing_key_here
VAPID_PUBLIC_KEY=paste_public_key_here
VAPID_PRIVATE_KEY=paste_private_key_here
VAPID_SUBJECT=mailto:you@example.com
```

**Important:** `.env` must NOT be committed to git. Verify it is already in `.gitignore` — if not, add `backend/.env` to `.gitignore` before committing anything.

- [ ] **Step 4: Check `.gitignore`**

```bash
cat /c/Users/uhp1m/Desktop/ilays/MyBooksApp/.gitignore 2>/dev/null || echo "no .gitignore found"
```

If `.env` is not covered, add it:
```bash
echo "backend/.env" >> .gitignore
```

- [ ] **Step 5: Commit the package changes (not the .env)**

```bash
cd ..
git add backend/package.json backend/package-lock.json
git commit -m "chore: add web-push and node-cron dependencies"
```

---

## Task 7: Backend — push endpoints and daily cron

**Files:**
- Modify: `backend/server.js`

- [ ] **Step 1: Add `web-push` and `node-cron` imports**

Find the existing imports at the top of `server.js`:
```js
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
```
Replace with:
```js
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import webpush from 'web-push';
import cron from 'node-cron';
```

- [ ] **Step 2: Configure VAPID after `dotenv.config()`**

Find:
```js
dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
```
Replace with:
```js
dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || 'mailto:admin@example.com',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}
```

- [ ] **Step 3: Add `pushSubscriptions` to `DEFAULT_DATA`**

Find:
```js
const DEFAULT_DATA = {
  version: 1,
  books: [],
  highlights: [],
  tags: [],
  settings: { defaultLanguage: 'en', sortOrder: 'dateAdded' },
};
```
Replace with:
```js
const DEFAULT_DATA = {
  version: 1,
  books: [],
  highlights: [],
  tags: [],
  settings: { defaultLanguage: 'en', sortOrder: 'dateAdded' },
  pushSubscriptions: [],
};
```

- [ ] **Step 4: Add the `sendDailyPush` helper function**

Find this line (just before the Express app routes start):
```js
app.use(cors());
```
Insert directly before it:
```js
async function sendDailyPush() {
  const data = readData();
  const subs = data.pushSubscriptions || [];
  if (!subs.length) return;

  const payload = JSON.stringify({
    title: '📖 Highlights of the Day',
    body: 'Tap to see today\'s quotes',
  });

  const failed = [];
  await Promise.all(subs.map(async sub => {
    try {
      await webpush.sendNotification(sub, payload);
    } catch (e) {
      if (e.statusCode === 410 || e.statusCode === 404) {
        failed.push(sub.endpoint);
      } else {
        console.error('Push send error:', e.message);
      }
    }
  }));

  if (failed.length) {
    data.pushSubscriptions = subs.filter(s => !failed.includes(s.endpoint));
    writeData(data);
    console.log(`Removed ${failed.length} expired push subscription(s)`);
  }
}

```

- [ ] **Step 5: Add the three push API endpoints**

Find this line in server.js (just before the AI Analysis section):
```js
// ── AI Analysis ───────────────────────────────────────────
```
Insert directly before it:
```js
// ── Push Notifications ────────────────────────────────────

app.get('/api/push/vapid-public-key', (req, res) => {
  res.json({ publicKey: process.env.VAPID_PUBLIC_KEY || '' });
});

app.post('/api/push/subscribe', (req, res) => {
  try {
    const subscription = req.body;
    if (!subscription?.endpoint) return res.status(400).json({ error: 'Invalid subscription' });
    const data = readData();
    if (!data.pushSubscriptions) data.pushSubscriptions = [];
    const exists = data.pushSubscriptions.some(s => s.endpoint === subscription.endpoint);
    if (!exists) {
      data.pushSubscriptions.push(subscription);
      writeData(data);
    }
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/push/test', async (req, res) => {
  try {
    await sendDailyPush();
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

```

- [ ] **Step 6: Add the cron job**

Find the last line of the file:
```js
app.listen(PORT, () => {
  console.log(`BookMarks running on port ${PORT}`);
  console.log(`Data file: ${DATA_FILE}`);
  console.log(`AI key: ${process.env.ANTHROPIC_API_KEY ? 'configured' : 'NOT SET'}`);
});
```
Replace with:
```js
// Daily push notification at 10:00 AM server time
cron.schedule('0 10 * * *', () => {
  console.log('Sending daily push notifications...');
  sendDailyPush().catch(e => console.error('Daily push failed:', e));
});

app.listen(PORT, () => {
  console.log(`BookMarks running on port ${PORT}`);
  console.log(`Data file: ${DATA_FILE}`);
  console.log(`AI key: ${process.env.ANTHROPIC_API_KEY ? 'configured' : 'NOT SET'}`);
  console.log(`Push: ${process.env.VAPID_PUBLIC_KEY ? 'configured' : 'NOT SET — add VAPID keys to .env'}`);
});
```

- [ ] **Step 7: Verify the backend starts cleanly**

```bash
cd backend && node server.js
```

Expected output (last line):
```
Push: configured
```
If it shows `NOT SET`, the `.env` file isn't being read — check that `.env` is in the `backend/` folder (not the project root).

- [ ] **Step 8: Test push end-to-end**

With both frontend dev server and backend running:
1. Open the app in the browser — allow notifications when prompted
2. Send a test push from the terminal:
   ```bash
   curl -X POST http://localhost:3001/api/push/test
   ```
3. A notification should appear on the device within a few seconds reading "📖 Highlights of the Day — Tap to see today's quotes"
4. Tapping the notification should open/focus the app

- [ ] **Step 9: Commit**

```bash
git add backend/server.js
git commit -m "feat: add push notification endpoints and daily 10am cron job"
```

---

## Task 8: Build and deploy

- [ ] **Step 1: Build the frontend**

```bash
cd frontend && npm run build
```

Expected: `frontend/dist/` folder is updated with no errors.

- [ ] **Step 2: Commit the build (if your deployment uses the dist folder)**

```bash
git add frontend/dist
git commit -m "build: rebuild frontend with carousel and push notification support"
```

- [ ] **Step 3: Push to GitHub**

```bash
git push origin main
```

- [ ] **Step 4: Restart the backend server on your hosting**

After the deploy, restart the backend process so it picks up the new VAPID environment variables and cron job. The exact command depends on your host (e.g. `pm2 restart all`, or redeploy via your platform's dashboard).

- [ ] **Step 5: Final end-to-end verification on mobile**

1. Open the app on your phone
2. Allow notifications when prompted
3. Call the test endpoint to verify push works on mobile:
   ```bash
   curl -X POST https://your-deployed-url/api/push/test
   ```
4. Notification should appear on your phone
5. Tap it — app should open showing the 5-quote carousel at the top of the Library page

---

## Notes

- **VAPID keys are generated once and never change.** Store them safely — if lost you'd need to regenerate and all existing subscriptions would stop working.
- **Cron runs on server time**, not your local time. If your server is in a different timezone, adjust the cron expression accordingly (e.g. for UTC+3 use `0 7 * * *` to fire at 10 AM local).
- **`backend/.env` must never be committed.** It contains private keys.

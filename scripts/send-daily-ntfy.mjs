// "Go read your quotes" reminder, delivered via ntfy.sh.
//
// GitHub's scheduled triggers are unreliable: an hourly cron produced 9 runs
// in two days instead of ~48, at arbitrary times. So this script must not
// assume it runs when asked. Instead of matching an exact hour, it treats the
// day as a window and sends whenever a reminder is *due* — which means any run
// that lands inside the window can do the job.
//
// "Due" is decided from ntfy's own 12h message cache rather than a state file,
// so there is nothing to commit and nothing to keep in sync.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const NTFY_SERVER = 'https://ntfy.sh/';
const TOPIC = 'ilay-bookmarks';
const APP_URL = 'https://ilaybar110.github.io/MyBooksApp/';
const TIMEZONE = 'Asia/Jerusalem';

const WINDOW_START = 10;      // first reminder no earlier than 10:00 local
const WINDOW_END = 21;        // last reminder before 21:00 local
const MIN_GAP_MINUTES = 105;  // ~2h apart, with slack for late runs

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_FILE = path.join(__dirname, '..', 'data', 'bookmarks.json');

/** Local date and hour in Jerusalem, independent of the runner's timezone. */
function localNow(at = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIMEZONE,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(at);
  const get = t => parts.find(p => p.type === t).value;
  return {
    date: `${get('year')}-${get('month')}-${get('day')}`,
    hour: Number(get('hour')) % 24,
    minute: Number(get('minute')),
  };
}

function readStreak() {
  try {
    const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
    const s = data.streak || {};
    return { current: s.current || 0, lastCompletedDate: s.lastCompletedDate || null };
  } catch (e) {
    console.warn(`Could not read streak: ${e.message}`);
    return { current: 0, lastCompletedDate: null };
  }
}

/**
 * When we last notified, from ntfy's cache of the topic. Returns null if the
 * cache can't be read — better to send a duplicate than to go silent.
 */
async function lastSentAt() {
  try {
    const res = await fetch(`${NTFY_SERVER}${TOPIC}/json?poll=1&since=12h`);
    if (!res.ok) return null;
    const text = await res.text();
    const times = text.split('\n').filter(Boolean).map(line => {
      try {
        const m = JSON.parse(line);
        return m.event === 'message' ? m.time : null;
      } catch { return null; }
    }).filter(Boolean);
    return times.length ? new Date(Math.max(...times) * 1000) : null;
  } catch (e) {
    console.warn(`Could not read ntfy history: ${e.message}`);
    return null;
  }
}

function buildMessage({ current, hour }) {
  const streakPart = current > 0 ? `🔥 ${current} day streak` : null;
  const isLate = hour >= WINDOW_END - 2;

  if (isLate) {
    return streakPart
      ? `Last call — ${streakPart} ends tonight`
      : "Last call — today's quotes are still unread";
  }
  if (hour <= WINDOW_START) {
    return streakPart
      ? `${streakPart} — read today's quotes to keep it`
      : "Time to read today's quotes";
  }
  return streakPart ? `Still unread — ${streakPart} on the line` : 'Your quotes are still waiting';
}

async function main() {
  const manual = process.env.GITHUB_EVENT_NAME === 'workflow_dispatch';
  const { date, hour, minute } = localNow();
  const clock = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;

  if (!manual && (hour < WINDOW_START || hour >= WINDOW_END)) {
    console.log(`Skipping: ${clock} ${TIMEZONE} is outside the ${WINDOW_START}:00-${WINDOW_END}:00 window.`);
    return;
  }

  const streak = readStreak();
  if (!manual && streak.lastCompletedDate === date) {
    console.log(`Skipping: already read today (${date}). Streak is ${streak.current}.`);
    return;
  }

  if (!manual) {
    const last = await lastSentAt();
    if (last) {
      const gapMinutes = (Date.now() - last.getTime()) / 60000;
      const lastLocal = localNow(last);
      const sameDay = lastLocal.date === date;
      if (sameDay && gapMinutes < MIN_GAP_MINUTES) {
        console.log(`Skipping: last reminder was ${Math.round(gapMinutes)} min ago (need ${MIN_GAP_MINUTES}).`);
        return;
      }
    }
  }

  const res = await fetch(NTFY_SERVER, {
    // JSON, not headers: ntfy's header format is ASCII-only and would mangle
    // any non-ASCII text.
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      topic: TOPIC,
      title: '📖 BookMarks',
      message: buildMessage({ current: streak.current, hour }),
      click: APP_URL,
      tags: ['books'],
      priority: 3,
    }),
  });

  if (!res.ok) throw new Error(`ntfy returned ${res.status}: ${await res.text()}`);
  console.log(`Sent at ${clock} ${TIMEZONE} (streak ${streak.current}, last read ${streak.lastCompletedDate ?? 'never'}).`);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});

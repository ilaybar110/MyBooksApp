// "Go read your quotes" reminder, delivered via ntfy.sh.
//
// The workflow runs hourly because GitHub's scheduled triggers are best-effort
// and get dropped under load — an hourly attempt survives a few misses. This
// script decides whether a given attempt should actually send.
//
// It nudges at 10:00 Jerusalem and every 2 hours after, stopping as soon as
// the day's reading is done (or at 20:00, whichever comes first).

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const NTFY_SERVER = 'https://ntfy.sh/';
const TOPIC = 'ilay-bookmarks';
const APP_URL = 'https://ilaybar110.github.io/MyBooksApp/';
const TIMEZONE = 'Asia/Jerusalem';

// Jerusalem local hours at which a reminder may go out.
const SLOTS = [10, 12, 14, 16, 18, 20];

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_FILE = path.join(__dirname, '..', 'data', 'bookmarks.json');

/** Local wall-clock date and hour in Jerusalem, independent of the runner's TZ. */
function jerusalemNow() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIMEZONE,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', hour12: false,
  }).formatToParts(new Date());
  const get = t => parts.find(p => p.type === t).value;
  return { date: `${get('year')}-${get('month')}-${get('day')}`, hour: Number(get('hour')) % 24 };
}

function readStreak() {
  try {
    const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
    const s = data.streak || {};
    return { current: s.current || 0, lastCompletedDate: s.lastCompletedDate || null };
  } catch (e) {
    console.warn(`Could not read streak from ${DATA_FILE}: ${e.message}`);
    return { current: 0, lastCompletedDate: null };
  }
}

function buildMessage({ current, hour }) {
  const remaining = SLOTS.filter(h => h > hour).length;
  const streakPart = current > 0 ? `🔥 ${current} day streak` : null;

  if (hour <= SLOTS[0]) {
    return streakPart
      ? `${streakPart} — read today's quotes to keep it`
      : "Time to read today's quotes";
  }
  // A later nudge: say plainly that it is still outstanding.
  if (streakPart && remaining === 0) return `Last call — ${streakPart} ends tonight`;
  if (streakPart) return `Still unread — ${streakPart} on the line`;
  return remaining === 0 ? "Last call — today's quotes are still unread" : "Your quotes are still waiting";
}

async function main() {
  const manual = process.env.GITHUB_EVENT_NAME === 'workflow_dispatch';
  const { date, hour } = jerusalemNow();

  if (!manual && !SLOTS.includes(hour)) {
    console.log(`Skipping: ${hour}:00 in ${TIMEZONE} is not a reminder slot (${SLOTS.join(', ')}).`);
    return;
  }

  const streak = readStreak();

  if (!manual && streak.lastCompletedDate === date) {
    console.log(`Skipping: already read today (${date}). Streak is ${streak.current}.`);
    return;
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

  if (!res.ok) {
    throw new Error(`ntfy returned ${res.status}: ${await res.text()}`);
  }

  console.log(`Sent reminder at ${hour}:00 ${TIMEZONE} (streak: ${streak.current}, last read: ${streak.lastCompletedDate ?? 'never'}).`);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});

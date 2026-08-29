// Daily "go read your quotes" reminder, delivered via ntfy.sh.
//
// GitHub cron is UTC-only and does not follow DST, so the workflow fires at
// both 07:00 and 08:00 UTC and this script keeps only the run that lands on
// 10:00 in Jerusalem. Manual (workflow_dispatch) runs skip the check.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const NTFY_SERVER = 'https://ntfy.sh/';
const TOPIC = 'ilay-bookmarks';
const APP_URL = 'https://ilaybar110.github.io/MyBooksApp/';
const TARGET_HOUR = 10;
const TIMEZONE = 'Asia/Jerusalem';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_FILE = path.join(__dirname, '..', 'data', 'bookmarks.json');

function jerusalemHour() {
  const hour = new Intl.DateTimeFormat('en-GB', {
    timeZone: TIMEZONE,
    hour: '2-digit',
    hour12: false,
  }).format(new Date());
  return Number(hour);
}

function readStreak() {
  try {
    const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
    return data.streak?.current || 0;
  } catch (e) {
    console.warn(`Could not read streak from ${DATA_FILE}: ${e.message}`);
    return 0;
  }
}

function buildMessage(streak) {
  if (streak > 0) {
    return `🔥 ${streak} day streak — read today's quotes to keep it`;
  }
  return "Time to read today's quotes";
}

async function main() {
  const manual = process.env.GITHUB_EVENT_NAME === 'workflow_dispatch';
  const hour = jerusalemHour();

  if (!manual && hour !== TARGET_HOUR) {
    console.log(`Skipping: it is ${hour}:00 in ${TIMEZONE}, not ${TARGET_HOUR}:00.`);
    return;
  }

  const streak = readStreak();

  // Publish as JSON, not headers: ntfy's header format is ASCII-only and
  // would mangle non-ASCII text.
  const res = await fetch(NTFY_SERVER, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      topic: TOPIC,
      title: '📖 BookMarks',
      message: buildMessage(streak),
      click: APP_URL,
      tags: ['books'],
      priority: 3,
    }),
  });

  if (!res.ok) {
    throw new Error(`ntfy returned ${res.status}: ${await res.text()}`);
  }

  console.log(`Sent reminder to topic "${TOPIC}" (streak: ${streak}).`);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});

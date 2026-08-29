import { getStorage, saveStorage } from './storage.js';

const FREEZE_COOLDOWN_DAYS = 7;

// Local YYYY-MM-DD — matches the `hotd5` convention in LibraryPage.
export function todayKey(d = new Date()) {
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function parseKey(key) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

// Whole days between two YYYY-MM-DD keys. Null `from` means "never".
function daysBetween(from, to) {
  if (!from) return null;
  const ms = parseKey(to) - parseKey(from);
  return Math.round(ms / 86400000);
}

function normalize(streak) {
  return {
    current: streak?.current || 0,
    longest: streak?.longest || 0,
    lastCompletedDate: streak?.lastCompletedDate || null,
    lastFreezeDate: streak?.lastFreezeDate || null,
  };
}

function freezeAvailable(streak, today) {
  const since = daysBetween(streak.lastFreezeDate, today);
  return since === null || since > FREEZE_COOLDOWN_DAYS;
}

export function getStreak() {
  return normalize(getStorage().streak);
}

/**
 * What the UI should show right now. Applies a lapse without persisting it,
 * so the flame never displays a streak that today's visit hasn't earned.
 */
export function getStreakStatus(today = todayKey()) {
  const streak = getStreak();
  const gap = daysBetween(streak.lastCompletedDate, today);

  const doneToday = gap === 0;
  // gap 1 = read yesterday, gap 2 = missed one day but a freeze can cover it.
  const alive = gap === 0 || gap === 1 || (gap === 2 && freezeAvailable(streak, today));

  return {
    current: alive ? streak.current : 0,
    longest: streak.longest,
    doneToday,
    atRisk: alive && !doneToday,
    freezeAvailable: freezeAvailable(streak, today),
  };
}

/**
 * The only writer. Call once when the day's reading is finished.
 * Returns { current, longest, usedFreeze, isNewRecord, alreadyDone }.
 */
export function markDayComplete(today = todayKey()) {
  const data = getStorage();
  const streak = normalize(data.streak);
  const gap = daysBetween(streak.lastCompletedDate, today);

  if (gap === 0) {
    return { ...streak, usedFreeze: false, isNewRecord: false, alreadyDone: true };
  }

  let current;
  let usedFreeze = false;

  if (gap === 1) {
    current = streak.current + 1;
  } else if (gap === 2 && freezeAvailable(streak, today)) {
    current = streak.current + 1;
    usedFreeze = true;
  } else {
    current = 1;
  }

  const longest = Math.max(streak.longest, current);
  const isNewRecord = current > streak.longest && current > 1;

  const next = {
    current,
    longest,
    lastCompletedDate: today,
    lastFreezeDate: usedFreeze ? today : streak.lastFreezeDate,
  };

  saveStorage({ ...data, streak: next });

  return { ...next, usedFreeze, isNewRecord, alreadyDone: false };
}

const COUNT = 5;

/** FNV-1a — small, stable, and identical on every device. */
function hashString(str) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

/** mulberry32 — seeded PRNG, so the same seed always gives the same sequence. */
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Whole days since the epoch for a YYYY-MM-DD key, timezone-independent. */
function dayNumber(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return Math.floor(Date.UTC(y, m - 1, d) / 86400000);
}

/**
 * The deck for a cycle: a seeded shuffle of the whole pool. Quotes that closed
 * the previous cycle are moved to the back half, so a quote is never dealt at
 * the end of one cycle and again at the start of the next.
 */
function deckForCycle(ordered, cycle) {
  let prev = null;
  for (let c = 0; c <= cycle; c++) {
    const deck = [...ordered];
    const random = mulberry32(hashString(`cycle-${c}`));
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    if (prev) {
      const recent = new Set(prev.slice(Math.ceil(deck.length / 2)).map(h => h.id));
      prev = [...deck.filter(h => !recent.has(h.id)), ...deck.filter(h => recent.has(h.id))];
    } else {
      prev = deck;
    }
  }
  return prev;
}

/**
 * The day's quotes, derived from the date rather than drawn at random.
 *
 * Two properties matter:
 *  - Every device agrees (iOS gives a Home Screen web app its own localStorage,
 *    so a per-device random roll showed different quotes on the same day).
 *  - Quotes don't repeat until the whole library has been shown. Drawing five
 *    independent random quotes each day repeats often (with ~180 quotes, about
 *    one day in eight shares a quote with the day before), so instead the pool
 *    is shuffled once per cycle and dealt out five a day, in order.
 *
 * Every highlight is eligible; favourites carry no weight. The pool is sorted
 * by id first so the result cannot depend on the order the highlights happen
 * to sit in.
 */
export function pickDailyFive(highlights, dateStr, count = COUNT) {
  if (!highlights?.length) return [];

  const ordered = [...highlights].sort((a, b) => String(a.id).localeCompare(String(b.id)));
  const n = ordered.length;
  const take = Math.min(count, n);

  const decks = new Map();
  const deckFor = cycle => {
    if (!decks.has(cycle)) decks.set(cycle, deckForCycle(ordered, cycle));
    return decks.get(cycle);
  };

  const picked = [];
  const seen = new Set();
  // Deal from where yesterday stopped. A day that straddles two cycles skips
  // any quote it already holds, so it never shows the same one twice.
  for (let pos = dayNumber(dateStr) * take; picked.length < take; pos++) {
    const h = deckFor(Math.floor(pos / n))[pos % n];
    if (seen.has(h.id)) continue;
    seen.add(h.id);
    picked.push(h);
  }

  return picked.sort((a, b) => (b.markedText?.length || 0) - (a.markedText?.length || 0));
}

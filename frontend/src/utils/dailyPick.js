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

/**
 * The day's quotes, derived from the date rather than drawn at random.
 *
 * iOS gives a Home Screen web app its own localStorage, so two containers on
 * one phone each rolled their own set and cached it separately — the same day
 * showed different quotes depending on how the app was opened. Seeding from
 * the date makes every device agree without having to share the choice.
 *
 * Every highlight is eligible; favourites carry no weight. The pool is sorted
 * by id first so the result cannot depend on the order the highlights happen
 * to sit in.
 */
export function pickDailyFive(highlights, dateStr, count = COUNT) {
  if (!highlights?.length) return [];

  // Every quote is eligible — favourites get no preference.
  const ordered = [...highlights].sort((a, b) => String(a.id).localeCompare(String(b.id)));

  const random = mulberry32(hashString(dateStr));
  for (let i = ordered.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [ordered[i], ordered[j]] = [ordered[j], ordered[i]];
  }

  return ordered
    .slice(0, count)
    .sort((a, b) => (b.markedText?.length || 0) - (a.markedText?.length || 0));
}

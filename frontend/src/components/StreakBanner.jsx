import React, { useEffect, useRef, useState } from 'react';

const prefersReducedMotion = () =>
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

/**
 * Counts up to `value` with an ease-out curve — from 0 on first mount, then
 * from the previous value whenever it changes.
 */
function useCountUp(value, duration = 800) {
  const [shown, setShown] = useState(0);
  const fromRef = useRef(0);

  useEffect(() => {
    const from = fromRef.current;
    fromRef.current = value;
    if (from === value) return;
    if (prefersReducedMotion()) { setShown(value); return; }

    let raf;
    const start = performance.now();
    const tick = (now) => {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setShown(Math.round(from + (value - from) * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);

  return shown;
}

// Thickness varies from book to book so the row doesn't look like a bar chart.
const BOOK_WEIGHTS = [1, 1.35, 0.8, 1.15, 0.9, 1.5, 1.05];

const SHELF_MAX = 60; // a new shelf every 60 books
// Books shrink as the streak grows: [slots per shelf, book height, gap] by tier.
const TIERS = [
  { slots: 15, height: 36, gap: 3 },
  { slots: 30, height: 26, gap: 2 },
  { slots: SHELF_MAX, height: 18, gap: 1 },
];

// One tiny book per streak day, with empty slots only for the next stretch.
// Every 7th book is gold, the newest glows on a record.
function BookShelf({ current, isRecord }) {
  const need = current + 1;
  const tier = TIERS.find((t) => need <= t.slots) || TIERS[TIERS.length - 1];
  const shelves = Math.ceil(need / tier.slots);
  const rows = [];
  for (let r = 0; r < shelves; r++) {
    const slots = [];
    for (let c = 0; c < tier.slots; c++) {
      const day = r * tier.slots + c + 1;
      if (day > current) {
        slots.push(<span key={day} className="slot" />);
        continue;
      }
      const cls = [
        'slot', 'book', `book-${day % 7}`, `tall-${day % 4}`,
        day % 7 === 0 && 'is-gold',
        day === current && isRecord && 'is-record',
        // The newest book leans on the empty space beside it, like a real shelf.
        day === current && c < tier.slots - 1 && 'is-lean',
      ].filter(Boolean).join(' ');
      slots.push(
        <span
          key={day}
          className={cls}
          style={{ '--i': Math.min(day, 100), flexGrow: BOOK_WEIGHTS[(day * 5) % BOOK_WEIGHTS.length] }}
        />
      );
    }
    rows.push(<div key={r} className="shelf-row">{slots}</div>);
  }
  return (
    <div
      className="streak-shelf"
      aria-hidden="true"
      style={{ '--row-h': `${tier.height}px`, '--gap': `${tier.gap}px` }}
    >
      {rows}
    </div>
  );
}

export default function StreakBanner({ streak, readCount = 0, total = 0 }) {
  const current = streak?.current || 0;
  const longest = streak?.longest || 0;
  const done = !!streak?.doneToday;
  const shown = useCountUp(current);

  // Fire the celebration only on the transition into "done".
  const [celebrate, setCelebrate] = useState(false);
  const wasDone = useRef(done);
  useEffect(() => {
    if (done && !wasDone.current && !prefersReducedMotion()) {
      setCelebrate(true);
      const t = setTimeout(() => setCelebrate(false), 1200);
      return () => clearTimeout(t);
    }
    wasDone.current = done;
  }, [done]);

  const pct = total > 0 ? Math.min(readCount / total, 1) : 0;

  return (
    <div
      className={`streak-banner${done ? ' is-done' : ''}${celebrate ? ' is-celebrating' : ''}`}
      role="status"
      aria-label={`${current} day reading streak. ${done ? 'Read today.' : `${readCount} of ${total} quotes read today.`}`}
    >
      <div className="streak-count">
        <span className="streak-number">{shown}</span>
        <span className="streak-label">
          day{shown === 1 ? '' : 's'} in a row
        </span>
      </div>

      <BookShelf current={current} isRecord={current >= longest && done} />

      <div className="streak-progress">
        <div className="streak-track" aria-hidden="true">
          <div className="streak-fill" style={{ transform: `scaleX(${pct})` }} />
        </div>
        <span className="streak-status">
          {done
            ? 'Read today ✓'
            : total > 0
              ? `${readCount} of ${total} today`
              : 'Nothing to read today'}
        </span>
        {longest > 0 && (
          <span className="streak-best">best {longest}</span>
        )}
      </div>
    </div>
  );
}

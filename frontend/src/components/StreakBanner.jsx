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

const SHELF_MAX = 7;
// Spine heights cycle through a fixed pattern so the shelf looks hand-stacked
// but stays stable between renders.
const SPINE_HEIGHTS = [38, 44, 34, 42, 46, 36, 40];
const SPINE_WIDTHS = [12, 15, 11, 14, 13, 16, 12];

function BookShelf({ current, isRecord }) {
  if (current <= 0) return null;
  const first = Math.max(1, current - SHELF_MAX + 1);
  const spines = [];
  for (let day = first; day <= current; day++) {
    const gold = day % 7 === 0;
    const isNewest = day === current;
    spines.push(
      <span
        key={day}
        className={`spine spine-${day % 4}${gold ? ' is-gold' : ''}${isNewest && isRecord ? ' is-record' : ''}`}
        style={{
          height: SPINE_HEIGHTS[day % SPINE_HEIGHTS.length],
          width: SPINE_WIDTHS[(day * 3) % SPINE_WIDTHS.length],
          '--i': day - first,
        }}
      />
    );
  }
  return (
    <div className="streak-shelf" aria-hidden="true">
      {first > 1 && <span className="shelf-more">+{first - 1}</span>}
      <div className="shelf-books">{spines}</div>
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

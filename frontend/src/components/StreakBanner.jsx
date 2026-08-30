import React, { useEffect, useRef, useState } from 'react';

const prefersReducedMotion = () =>
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

/** Counts from 0 up to `value` with an ease-out curve. */
function useCountUp(value, duration = 800) {
  const [shown, setShown] = useState(value);
  const fromRef = useRef(value);

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
      <span className={`streak-flame${done ? ' is-lit' : ''}`} aria-hidden="true">🔥</span>

      <div className="streak-count">
        <span className="streak-number">{shown}</span>
        <span className="streak-label">
          day{shown === 1 ? '' : 's'} in a row
        </span>
      </div>

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

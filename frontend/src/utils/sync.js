import { getStorage, replaceStorage } from './storage.js';
import { getGithubToken, fetchGistData, pushGistData } from './gist.js';

const MIN_INTERVAL_MS = 30_000;
let lastRun = 0;
let inFlight = null;

function count(data) {
  if (!data) return 0;
  return (data.books?.length || 0) + (data.highlights?.length || 0);
}

const stamp = data => data?.lastModified || 0;

/**
 * Two-way sync, safe enough to run unattended.
 *
 * iOS gives a Home Screen web app its own localStorage container, so the same
 * library can live in two places on one phone. This keeps them level by
 * last-write-wins, and never lets an empty side win — that is what wiped the
 * repo before the guard in storage.js existed.
 *
 * Returns 'pulled' when local storage changed and the UI should refresh.
 */
export async function autoSync({ force = false } = {}) {
  if (!getGithubToken()) return 'skipped';
  if (inFlight) return inFlight;
  if (!force && Date.now() - lastRun < MIN_INTERVAL_MS) return 'throttled';

  inFlight = (async () => {
    try {
      const local = getStorage();
      let remote = null;
      try {
        remote = await fetchGistData();
      } catch {
        remote = null; // nothing in the repo yet, or it is unreadable
      }

      const lc = count(local);
      const rc = count(remote);

      // An empty side never overwrites a populated one, in either direction.
      if (lc === 0 && rc === 0) return 'noop';
      if (lc === 0) { replaceStorage(remote); return 'pulled'; }
      if (rc === 0) { await pushGistData(local); return 'pushed'; }

      if (stamp(remote) > stamp(local)) { replaceStorage(remote); return 'pulled'; }
      if (stamp(local) > stamp(remote)) { await pushGistData(local); return 'pushed'; }
      return 'noop';
    } catch (e) {
      console.warn('Auto-sync failed:', e);
      return 'error';
    } finally {
      lastRun = Date.now();
      inFlight = null;
    }
  })();

  return inFlight;
}

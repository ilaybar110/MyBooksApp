import { useState, useEffect, useCallback } from 'react';
import { getStorage, saveStorage } from '../utils/storage.js';
import { getGithubToken, fetchGistData } from '../utils/gist.js';

/**
 * Hook for reading/subscribing to the localStorage state.
 * Returns the full store and a refresh function.
 */
export function useStorage() {
  const [store, setStore] = useState(() => getStorage());
  const [syncing, setSyncing] = useState(false);

  const refresh = useCallback(() => {
    setStore(getStorage());
  }, []);

  // Pull from repo on mount if configured
  useEffect(() => {
    const token = getGithubToken();
    if (!token) return;
    setSyncing(true);
    fetchGistData()
      .then(data => {
        localStorage.setItem('bookmarks_app', JSON.stringify(data));
        setStore(data);
      })
      .catch(e => console.warn('Gist pull failed:', e))
      .finally(() => setSyncing(false));
  }, []);

  useEffect(() => {
    // Refresh on visibility change (returning from background)
    const handleVisibility = () => {
      if (!document.hidden) refresh();
    };
    document.addEventListener('visibilitychange', handleVisibility);

    // Refresh on storage events from other tabs
    const handleStorage = (e) => {
      if (e.key === 'bookmarks_app') refresh();
    };
    window.addEventListener('storage', handleStorage);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('storage', handleStorage);
    };
  }, [refresh]);

  return { store, refresh, syncing };
}

/**
 * Hook for managing a specific book's data.
 */
export function useBook(bookId) {
  const { store, refresh } = useStorage();
  const book = store.books?.find(b => b.id === bookId) || null;
  const highlights = store.highlights?.filter(h => h.bookId === bookId) || [];

  return { book, highlights, refresh };
}

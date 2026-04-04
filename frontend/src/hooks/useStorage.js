import { useState, useEffect, useCallback } from 'react';
import { getStorage, saveStorage } from '../utils/storage.js';

/**
 * Hook for reading/subscribing to the localStorage state.
 * Returns the full store and a refresh function.
 */
export function useStorage() {
  const [store, setStore] = useState(() => getStorage());

  const refresh = useCallback(() => {
    setStore(getStorage());
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

  return { store, refresh };
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

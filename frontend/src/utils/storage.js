const STORAGE_KEY = 'bookmarks_app';
const VERSION = 1;

const DEFAULT_STATE = {
  version: VERSION,
  books: [],
  highlights: [],
  tags: [],
  settings: {
    defaultLanguage: 'en',
    sortOrder: 'dateAdded',
  },
};

export function getStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const initial = { ...DEFAULT_STATE };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
      return initial;
    }
    const parsed = JSON.parse(raw);
    if (!parsed.version) parsed.version = VERSION;
    if (!parsed.books) parsed.books = [];
    if (!parsed.highlights) parsed.highlights = [];
    if (!parsed.tags) parsed.tags = [];
    if (!parsed.settings) parsed.settings = { ...DEFAULT_STATE.settings };
    return parsed;
  } catch (e) {
    console.error('Storage read error:', e);
    return { ...DEFAULT_STATE };
  }
}

export function saveStorage(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('Storage write error:', e);
    if (e.name === 'QuotaExceededError') {
      throw new Error('Storage full. Please export and clear some data.');
    }
    throw e;
  }
}

export function addBook(bookData) {
  const store = getStorage();
  const book = {
    ...bookData,
    dateAdded: bookData.dateAdded || new Date().toISOString(),
    highlights: bookData.highlights || [],
    tags: bookData.tags || [],
  };
  store.books.push(book);
  saveStorage(store);
  return book;
}

export function updateBook(id, updates) {
  const store = getStorage();
  const idx = store.books.findIndex(b => b.id === id);
  if (idx === -1) return null;
  store.books[idx] = { ...store.books[idx], ...updates };
  saveStorage(store);
  return store.books[idx];
}

export function deleteBook(id) {
  const store = getStorage();
  store.highlights = store.highlights.filter(h => h.bookId !== id);
  store.books = store.books.filter(b => b.id !== id);
  saveStorage(store);
}

export function getBook(id) {
  const store = getStorage();
  return store.books.find(b => b.id === id) || null;
}

export function addHighlight(highlightData) {
  const store = getStorage();
  const highlight = {
    ...highlightData,
    dateAdded: highlightData.dateAdded || new Date().toISOString(),
    isFavorite: highlightData.isFavorite || false,
    tags: highlightData.tags || [],
    isEdited: highlightData.isEdited || false,
  };
  store.highlights.push(highlight);
  const bookIdx = store.books.findIndex(b => b.id === highlight.bookId);
  if (bookIdx !== -1) {
    if (!store.books[bookIdx].highlights) store.books[bookIdx].highlights = [];
    store.books[bookIdx].highlights.push(highlight.id);
  }
  saveStorage(store);
  return highlight;
}

export function updateHighlight(id, updates) {
  const store = getStorage();
  const idx = store.highlights.findIndex(h => h.id === id);
  if (idx === -1) return null;
  store.highlights[idx] = { ...store.highlights[idx], ...updates };
  saveStorage(store);
  return store.highlights[idx];
}

export function deleteHighlight(id) {
  const store = getStorage();
  const highlight = store.highlights.find(h => h.id === id);
  if (!highlight) return;
  store.highlights = store.highlights.filter(h => h.id !== id);
  const bookIdx = store.books.findIndex(b => b.id === highlight.bookId);
  if (bookIdx !== -1) {
    store.books[bookIdx].highlights = (store.books[bookIdx].highlights || []).filter(hid => hid !== id);
  }
  saveStorage(store);
}

export function getHighlights(bookId) {
  const store = getStorage();
  if (bookId) return store.highlights.filter(h => h.bookId === bookId);
  return store.highlights;
}

export function getAllTags() {
  return getStorage().tags || [];
}

export function addTag(tag) {
  const store = getStorage();
  if (!store.tags) store.tags = [];
  if (!store.tags.includes(tag)) {
    store.tags.push(tag);
    saveStorage(store);
  }
  return store.tags;
}

export function renameTag(oldTag, newTag) {
  const store = getStorage();
  store.tags = (store.tags || []).map(t => t === oldTag ? newTag : t);
  store.books = store.books.map(b => ({ ...b, tags: (b.tags || []).map(t => t === oldTag ? newTag : t) }));
  store.highlights = store.highlights.map(h => ({ ...h, tags: (h.tags || []).map(t => t === oldTag ? newTag : t) }));
  saveStorage(store);
}

export function deleteTag(tag) {
  const store = getStorage();
  store.tags = (store.tags || []).filter(t => t !== tag);
  store.books = store.books.map(b => ({ ...b, tags: (b.tags || []).filter(t => t !== tag) }));
  store.highlights = store.highlights.map(h => ({ ...h, tags: (h.tags || []).filter(t => t !== tag) }));
  saveStorage(store);
}

export function getSettings() {
  return getStorage().settings || DEFAULT_STATE.settings;
}

export function updateSettings(updates) {
  const store = getStorage();
  store.settings = { ...store.settings, ...updates };
  saveStorage(store);
  return store.settings;
}

export function exportData() {
  return JSON.stringify(getStorage(), null, 2);
}

export function importData(jsonString) {
  try {
    const data = JSON.parse(jsonString);
    if (!data.books || !data.highlights) throw new Error('Invalid data format');
    if (!data.version) data.version = VERSION;
    if (!data.tags) data.tags = [];
    if (!data.settings) data.settings = { ...DEFAULT_STATE.settings };
    saveStorage(data);
    return true;
  } catch (e) {
    throw new Error('Failed to import: ' + e.message);
  }
}

export function clearAllData() {
  saveStorage({ ...DEFAULT_STATE });
}

const API_KEY_STORAGE_KEY = 'bookmarks_api_key';
export function getApiKey() { return localStorage.getItem(API_KEY_STORAGE_KEY) || ''; }
export function saveApiKey(key) {
  if (key) localStorage.setItem(API_KEY_STORAGE_KEY, key.trim());
  else localStorage.removeItem(API_KEY_STORAGE_KEY);
}

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import BookCard from '../components/BookCard.jsx';
import EmptyState from '../components/EmptyState.jsx';
import { getStorage, getHighlights } from '../utils/storage.js';
import { sortBooks, isHebrew, getTextDirection } from '../utils/helpers.js';

export default function LibraryPage({ navigate }) {
  const [books, setBooks] = useState([]);
  const [highlights, setHighlights] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState('dateAdded');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [hotd, setHotd] = useState(null);
  const debRef = useRef(null);

  const loadData = useCallback(() => {
    const store = getStorage();
    setBooks(store.books || []);
    setHighlights(store.highlights || []);
  }, []);

  useEffect(() => {
    loadData();
    // Reload when returning to this page
    const handler = () => loadData();
    window.addEventListener('focus', handler);
    return () => window.removeEventListener('focus', handler);
  }, [loadData]);

  // Re-load on visibility change (when returning from other pages)
  useEffect(() => {
    const handler = () => {
      if (!document.hidden) loadData();
    };
    document.addEventListener('visibilitychange', handler);
    return () => document.removeEventListener('visibilitychange', handler);
  }, [loadData]);

  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    const stored = (() => { try { return JSON.parse(localStorage.getItem('hotd') || '{}'); } catch { return {}; } })();
    if (stored.date === today && stored.id) {
      const all = getHighlights();
      const found = all.find(h => h.id === stored.id);
      if (found) { setHotd(found); return; }
    }
    const all = getHighlights();
    if (!all.length) return;
    const favs = all.filter(h => h.isFavorite);
    const pool = favs.length ? favs : all;
    const picked = pool[Math.floor(Math.random() * pool.length)];
    localStorage.setItem('hotd', JSON.stringify({ date: today, id: picked.id }));
    setHotd(picked);
  }, []);

  const getHighlightCount = (bookId) =>
    highlights.filter(h => h.bookId === bookId).length;

  const filteredBooks = useMemo(() => sortBooks(
    books.filter(book => {
      if (!debouncedQ.trim()) return true;
      const q = debouncedQ.toLowerCase();
      return (
        book.title?.toLowerCase().includes(q) ||
        book.author?.toLowerCase().includes(q) ||
        (book.tags || []).some(t => t.toLowerCase().includes(q))
      );
    }),
    sortOrder
  ), [books, debouncedQ, sortOrder]);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
      {/* Header */}
      <div
        style={{
          padding: '16px 20px 0',
          paddingTop: 'calc(16px + env(safe-area-inset-top, 0px))',
          background: 'var(--bg-primary)',
          position: 'sticky',
          top: 0,
          zIndex: 10,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '16px',
          }}
        >
          <div>
            <h1
              style={{
                fontFamily: 'Lora, serif',
                fontSize: '26px',
                fontWeight: 700,
                color: 'var(--text-primary)',
                margin: 0,
                lineHeight: 1.2,
              }}
            >
              My Library
            </h1>
            <p
              style={{
                fontFamily: 'DM Sans, sans-serif',
                fontSize: '13px',
                color: 'var(--text-muted)',
                margin: '2px 0 0',
              }}
            >
              {books.length} {books.length === 1 ? 'book' : 'books'}
            </p>
          </div>
          <button
            onClick={() => navigate('add-book')}
            aria-label="Add new book"
            className="btn-primary"
            style={{ padding: '10px 16px', fontSize: '14px' }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Add Book
          </button>
        </div>

        {/* Search + Sort */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', alignItems: 'center' }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--text-muted)"
              strokeWidth="2"
              style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="search"
              className="input-field"
              placeholder="Search books..."
              value={searchQuery}
              onChange={e => { setSearchQuery(e.target.value); clearTimeout(debRef.current); debRef.current = setTimeout(() => setDebouncedQ(e.target.value), 150); }}
              style={{ paddingLeft: '36px' }}
            />
          </div>
          <select
            className="input-field"
            value={sortOrder}
            onChange={e => setSortOrder(e.target.value)}
            style={{ width: 'auto', flexShrink: 0, paddingRight: '28px', fontSize: '13px' }}
          >
            <option value="dateAdded">Newest</option>
            <option value="title">Title</option>
            <option value="author">Author</option>
            <option value="rating">Rating</option>
          </select>
        </div>

        {/* Divider */}
        <div style={{ height: '1px', background: 'var(--border)', margin: '0 -20px' }} />
      </div>

      {/* Books grid */}
      <div style={{ padding: '20px' }}>
        {hotd && highlights.length > 0 && (
          <div style={{ marginBottom: '18px', padding: '14px 16px', background: 'rgba(196,147,58,0.06)', borderLeft: '3px solid #C4933A', borderRadius: '8px' }}>
            <p style={{ margin: '0 0 6px', fontSize: '10px', fontWeight: 700, color: '#C4933A', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Highlight of the Day</p>
            <p style={{ margin: '0 0 8px', fontSize: '14px', lineHeight: 1.65, color: 'var(--text-primary)', direction: getTextDirection(hotd.markedText), textAlign: isHebrew(hotd.markedText) ? 'right' : 'left', fontFamily: isHebrew(hotd.markedText) ? 'serif' : undefined }}>{hotd.markedText}</p>
            <button onClick={() => { const b = books.find(x => x.id === hotd.bookId); if (b) navigate('book-detail', { bookId: b.id }); }} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontSize: '12px', color: 'var(--accent-primary)', fontFamily: 'DM Sans, sans-serif', fontWeight: 500 }}>
              {(() => { const b = books.find(x => x.id === hotd.bookId); return b ? `— ${b.title}` : ''; })()}
            </button>
          </div>
        )}
        {filteredBooks.length === 0 ? (
          searchQuery ? (
            <EmptyState
              icon={
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
              }
              title="No books found"
              description={`No books match "${searchQuery}"`}
            />
          ) : (
            <EmptyState
              icon={
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                  <circle cx="12" cy="13" r="4"/>
                </svg>
              }
              title="Photograph your first marked page"
              description="Take a photo of a book page with pencil marks — AI will extract your highlights automatically."
              action={
                <button className="btn-primary" onClick={() => navigate('add-book')}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  Add Your First Book
                </button>
              }
            />
          )
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '16px',
            }}
          >
            {filteredBooks.map(book => (
              <BookCard
                key={book.id}
                book={book}
                highlightCount={getHighlightCount(book.id)}
                onClick={() => navigate('book-detail', { bookId: book.id })}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

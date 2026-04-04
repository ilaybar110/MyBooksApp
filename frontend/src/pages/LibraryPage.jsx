import React, { useState, useEffect, useCallback } from 'react';
import BookCard from '../components/BookCard.jsx';
import EmptyState from '../components/EmptyState.jsx';
import { getStorage } from '../utils/storage.js';
import { sortBooks } from '../utils/helpers.js';

export default function LibraryPage({ navigate }) {
  const [books, setBooks] = useState([]);
  const [highlights, setHighlights] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState('dateAdded');

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

  const getHighlightCount = (bookId) =>
    highlights.filter(h => h.bookId === bookId).length;

  const filteredBooks = sortBooks(
    books.filter(book => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        book.title?.toLowerCase().includes(q) ||
        book.author?.toLowerCase().includes(q) ||
        (book.tags || []).some(t => t.toLowerCase().includes(q))
      );
    }),
    sortOrder
  );

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
              onChange={e => setSearchQuery(e.target.value)}
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
          </select>
        </div>

        {/* Divider */}
        <div style={{ height: '1px', background: 'var(--border)', margin: '0 -20px' }} />
      </div>

      {/* Books grid */}
      <div style={{ padding: '20px' }}>
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
                  <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                  <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                </svg>
              }
              title="Your library is empty"
              description="Add your first book to start collecting highlights from your reading."
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

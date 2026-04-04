import React, { useState, useEffect, useCallback } from 'react';
import HighlightCard from '../components/HighlightCard.jsx';
import EmptyState from '../components/EmptyState.jsx';
import TagPill from '../components/TagPill.jsx';
import {
  getStorage,
  updateHighlight,
  deleteHighlight,
  getAllTags,
  addTag,
} from '../utils/storage.js';
import { sortHighlights } from '../utils/helpers.js';

export default function AllHighlightsPage({ navigate }) {
  const [highlights, setHighlights] = useState([]);
  const [books, setBooks] = useState([]);
  const [allTags, setAllTags] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterFavorites, setFilterFavorites] = useState(false);
  const [filterTag, setFilterTag] = useState(null);
  const [filterBookId, setFilterBookId] = useState(null);
  const [showFilters, setShowFilters] = useState(false);

  const loadData = useCallback(() => {
    const store = getStorage();
    setHighlights(store.highlights || []);
    setBooks(store.books || []);
    setAllTags(getAllTags());
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    const handler = () => { if (!document.hidden) loadData(); };
    document.addEventListener('visibilitychange', handler);
    return () => document.removeEventListener('visibilitychange', handler);
  }, [loadData]);

  const getBookTitle = (bookId) => {
    const book = books.find(b => b.id === bookId);
    return book?.title || 'Unknown Book';
  };

  const handleFavoriteToggle = (id, isFavorite) => {
    updateHighlight(id, { isFavorite });
    setHighlights(prev => prev.map(h => h.id === id ? { ...h, isFavorite } : h));
  };

  const handleDeleteHighlight = (id) => {
    deleteHighlight(id);
    setHighlights(prev => prev.filter(h => h.id !== id));
  };

  const handleTagAdd = (highlightId, tag) => {
    const h = highlights.find(x => x.id === highlightId);
    if (!h) return;
    const newTags = [...new Set([...(h.tags || []), tag])];
    updateHighlight(highlightId, { tags: newTags });
    setHighlights(prev => prev.map(x => x.id === highlightId ? { ...x, tags: newTags } : x));
    addTag(tag);
    setAllTags(getAllTags());
  };

  const handleTagRemove = (highlightId, tag) => {
    const h = highlights.find(x => x.id === highlightId);
    if (!h) return;
    const newTags = (h.tags || []).filter(t => t !== tag);
    updateHighlight(highlightId, { tags: newTags });
    setHighlights(prev => prev.map(x => x.id === highlightId ? { ...x, tags: newTags } : x));
  };

  const filtered = sortHighlights(
    highlights.filter(h => {
      if (filterFavorites && !h.isFavorite) return false;
      if (filterTag && !(h.tags || []).includes(filterTag)) return false;
      if (filterBookId && h.bookId !== filterBookId) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          h.markedText?.toLowerCase().includes(q) ||
          h.fullContext?.toLowerCase().includes(q) ||
          (h.tags || []).some(t => t.toLowerCase().includes(q)) ||
          getBookTitle(h.bookId).toLowerCase().includes(q)
        );
      }
      return true;
    })
  );

  const activeFilterCount = [filterFavorites, filterTag, filterBookId].filter(Boolean).length;

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
              }}
            >
              Highlights
            </h1>
            <p
              style={{
                fontFamily: 'DM Sans, sans-serif',
                fontSize: '13px',
                color: 'var(--text-muted)',
                margin: '2px 0 0',
              }}
            >
              {filtered.length} of {highlights.length} highlight{highlights.length !== 1 ? 's' : ''}
            </p>
          </div>
          <button
            onClick={() => setShowFilters(v => !v)}
            style={{
              background: activeFilterCount > 0 ? 'var(--accent-primary)' : 'var(--bg-secondary)',
              border: '1px solid ' + (activeFilterCount > 0 ? 'var(--accent-primary)' : 'var(--border)'),
              borderRadius: '8px',
              padding: '8px 14px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              color: activeFilterCount > 0 ? 'white' : 'var(--text-secondary)',
              fontFamily: 'DM Sans, sans-serif',
              fontSize: '13px',
              fontWeight: 500,
              minHeight: '44px',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
            </svg>
            Filter
            {activeFilterCount > 0 && (
              <span
                style={{
                  background: 'white',
                  color: 'var(--accent-primary)',
                  borderRadius: '50%',
                  width: '18px',
                  height: '18px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '11px',
                  fontWeight: 700,
                }}
              >
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>

        {/* Search bar */}
        <div style={{ position: 'relative', marginBottom: '12px' }}>
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
            placeholder="Search highlights..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{ paddingLeft: '36px' }}
          />
        </div>

        {/* Filter panel */}
        {showFilters && (
          <div
            className="animate-fade-in"
            style={{
              background: 'var(--bg-card)',
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '12px',
              boxShadow: '0 2px 8px rgba(44,36,32,0.08)',
            }}
          >
            {/* Favorites filter */}
            <div style={{ marginBottom: '14px' }}>
              <button
                onClick={() => setFilterFavorites(v => !v)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 0,
                }}
              >
                <div
                  style={{
                    width: '20px',
                    height: '20px',
                    borderRadius: '4px',
                    border: '2px solid ' + (filterFavorites ? 'var(--accent-favorite)' : 'var(--border)'),
                    background: filterFavorites ? 'var(--accent-favorite)' : 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    transition: 'all 200ms',
                  }}
                >
                  {filterFavorites && (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </div>
                <span
                  style={{
                    fontFamily: 'DM Sans, sans-serif',
                    fontSize: '14px',
                    color: 'var(--text-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="var(--accent-favorite)" stroke="var(--accent-favorite)" strokeWidth="0">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                  </svg>
                  Favorites only
                </span>
              </button>
            </div>

            {/* Tag filter */}
            {allTags.length > 0 && (
              <div style={{ marginBottom: '14px' }}>
                <p
                  style={{
                    fontFamily: 'DM Sans, sans-serif',
                    fontSize: '11px',
                    fontWeight: 600,
                    color: 'var(--text-muted)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    margin: '0 0 8px',
                  }}
                >
                  Filter by Tag
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {allTags.map(tag => (
                    <TagPill
                      key={tag}
                      tag={tag}
                      active={filterTag === tag}
                      onClick={() => setFilterTag(filterTag === tag ? null : tag)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Book filter */}
            {books.length > 0 && (
              <div>
                <p
                  style={{
                    fontFamily: 'DM Sans, sans-serif',
                    fontSize: '11px',
                    fontWeight: 600,
                    color: 'var(--text-muted)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    margin: '0 0 8px',
                  }}
                >
                  Filter by Book
                </p>
                <select
                  className="input-field"
                  value={filterBookId || ''}
                  onChange={e => setFilterBookId(e.target.value || null)}
                  style={{ fontSize: '13px' }}
                >
                  <option value="">All books</option>
                  {books.map(book => (
                    <option key={book.id} value={book.id}>{book.title}</option>
                  ))}
                </select>
              </div>
            )}

            {activeFilterCount > 0 && (
              <button
                onClick={() => {
                  setFilterFavorites(false);
                  setFilterTag(null);
                  setFilterBookId(null);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontFamily: 'DM Sans, sans-serif',
                  fontSize: '13px',
                  color: 'var(--danger)',
                  padding: '8px 0 0',
                  display: 'block',
                }}
              >
                Clear all filters
              </button>
            )}
          </div>
        )}

        <div style={{ height: '1px', background: 'var(--border)', margin: '0 -20px' }} />
      </div>

      {/* Content */}
      <div style={{ padding: '16px 20px' }}>
        {highlights.length === 0 ? (
          <EmptyState
            icon={
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5">
                <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
              </svg>
            }
            title="No highlights yet"
            description="Add books to your library and photograph marked pages to build your collection."
            action={
              <button className="btn-primary" onClick={() => navigate('library')}>
                Go to Library
              </button>
            }
          />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            }
            title="No matches"
            description="Try adjusting your search or filters."
            action={
              <button
                className="btn-secondary"
                onClick={() => {
                  setSearchQuery('');
                  setFilterFavorites(false);
                  setFilterTag(null);
                  setFilterBookId(null);
                }}
              >
                Clear Search & Filters
              </button>
            }
          />
        ) : (
          filtered.map(highlight => (
            <HighlightCard
              key={highlight.id}
              highlight={highlight}
              bookTitle={getBookTitle(highlight.bookId)}
              showBookTitle
              onFavoriteToggle={handleFavoriteToggle}
              onDelete={handleDeleteHighlight}
              onTagAdd={handleTagAdd}
              onTagRemove={handleTagRemove}
              allTags={allTags}
              navigate={navigate}
            />
          ))
        )}
      </div>
    </div>
  );
}

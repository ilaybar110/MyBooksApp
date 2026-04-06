import React, { useState, useEffect, useCallback } from 'react';
import HighlightCard from '../components/HighlightCard.jsx';
import EmptyState from '../components/EmptyState.jsx';
import Modal, { ConfirmModal } from '../components/Modal.jsx';
import {
  getBook,
  getHighlights,
  deleteBook,
  updateBook,
  updateHighlight,
  deleteHighlight,
  addHighlight,
  getAllTags,
  addTag,
} from '../utils/storage.js';
import { fileToBase64, compressImage, isHebrew } from '../utils/helpers.js';

export default function BookDetailPage({ navigate, bookId }) {
  const [book, setBook] = useState(null);
  const [highlights, setHighlights] = useState([]);
  const [allTags, setAllTags] = useState([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showEditBookModal, setShowEditBookModal] = useState(false);
  const [showAddManualModal, setShowAddManualModal] = useState(false);
  const [manualDraft, setManualDraft] = useState({ markedText: '', fullContext: '', pageNumber: '' });
  const [searchQuery, setSearchQuery] = useState('');
  const [editBookDraft, setEditBookDraft] = useState(null);
  const [editBookCoverPreview, setEditBookCoverPreview] = useState(null);

  const loadData = useCallback(() => {
    const b = getBook(bookId);
    if (!b) {
      navigate('library');
      return;
    }
    setBook(b);
    setHighlights(getHighlights(bookId));
    setAllTags(getAllTags());
  }, [bookId, navigate]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleFavoriteToggle = (id, isFavorite) => {
    updateHighlight(id, { isFavorite });
    setHighlights(prev => prev.map(h => h.id === id ? { ...h, isFavorite } : h));
  };

  const handleDeleteHighlight = (id) => {
    deleteHighlight(id);
    setHighlights(prev => prev.filter(h => h.id !== id));
    // Update book highlight count
    setBook(prev => prev ? { ...prev, highlights: (prev.highlights || []).filter(hid => hid !== id) } : prev);
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

  const handleAddManualSave = () => {
    if (!manualDraft.markedText.trim()) return;
    const newHighlight = addHighlight({
      id: `h_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      bookId: bookId,
      markedText: manualDraft.markedText.trim(),
      fullContext: manualDraft.fullContext.trim() || '',
      pageNumber: manualDraft.pageNumber ? Number(manualDraft.pageNumber) : null,
      isFavorite: false,
      tags: [],
      isEdited: false,
      dateAdded: new Date().toISOString(),
    });
    setHighlights(prev => [...prev, newHighlight]);
    setManualDraft({ markedText: '', fullContext: '', pageNumber: '' });
    setShowAddManualModal(false);
  };

  const handleDeleteBook = () => {
    deleteBook(bookId);
    navigate('library');
  };

  const handleEditHighlight = (id, updates) => {
    updateHighlight(id, updates);
    setHighlights(prev => prev.map(h => h.id === id ? { ...h, ...updates } : h));
  };

  const openEditBook = () => {
    setEditBookDraft({
      title: book.title || '',
      author: book.author || '',
      language: book.language || 'en',
    });
    setEditBookCoverPreview(book.coverPhoto || null);
    setShowEditBookModal(true);
  };

  const handleEditBookCoverChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const base64 = await fileToBase64(file);
      const compressed = await compressImage(base64, 600, 0.8);
      setEditBookCoverPreview(compressed);
      setEditBookDraft(d => ({ ...d, coverPhoto: compressed }));
    } catch (err) {
      console.error('Failed to process image', err);
    }
  };

  const handleEditBookSave = () => {
    if (!editBookDraft.title.trim() || !editBookDraft.author.trim()) return;
    const updates = {
      title: editBookDraft.title.trim(),
      author: editBookDraft.author.trim(),
      language: editBookDraft.language,
    };
    if (editBookDraft.coverPhoto !== undefined) {
      updates.coverPhoto = editBookDraft.coverPhoto;
    } else if (editBookCoverPreview !== book.coverPhoto) {
      updates.coverPhoto = editBookCoverPreview;
    }
    const updated = updateBook(bookId, updates);
    setBook(updated);
    setShowEditBookModal(false);
  };

  const filteredHighlights = highlights.filter(h => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      h.markedText?.toLowerCase().includes(q) ||
      h.fullContext?.toLowerCase().includes(q) ||
      (h.tags || []).some(t => t.toLowerCase().includes(q))
    );
  });

  if (!book) return null;

  const bookRtl = ['he', 'ar', 'fa', 'ur'].includes(book.language) || isHebrew(book.title) || isHebrew(book.author);
  const bookDir = bookRtl ? 'rtl' : 'ltr';

  const favoriteCount = highlights.filter(h => h.isFavorite).length;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
      {/* Back header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 20px',
          paddingTop: 'calc(16px + env(safe-area-inset-top, 0px))',
          background: 'var(--bg-primary)',
          position: 'sticky',
          top: 0,
          zIndex: 10,
          borderBottom: '1px solid var(--border)',
        }}
      >
        <button
          onClick={() => navigate('library')}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            color: 'var(--accent-primary)',
            fontFamily: 'DM Sans, sans-serif',
            fontSize: '14px',
            fontWeight: 500,
            padding: '4px 0',
            minHeight: '44px',
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Library
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <button
            onClick={openEditBook}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-muted)',
              padding: '8px',
              minHeight: '44px',
              display: 'flex',
              alignItems: 'center',
            }}
            aria-label="Edit book"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
          </button>
          <button
            onClick={() => setShowDeleteModal(true)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-muted)',
              padding: '8px',
              minHeight: '44px',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6l-1 14H6L5 6" />
              <path d="M10 11v6M14 11v6" />
              <path d="M9 6V4h6v2" />
            </svg>
          </button>
        </div>
      </div>

      {/* Book hero */}
      <div
        style={{
          display: 'flex',
          gap: '20px',
          padding: '24px 20px',
          background: 'var(--bg-card)',
          borderBottom: '1px solid var(--border)',
        }}
      >
        {/* Cover */}
        <div
          style={{
            width: '80px',
            flexShrink: 0,
            aspectRatio: '2/3',
            borderRadius: '6px',
            overflow: 'hidden',
            background: 'var(--bg-secondary)',
            boxShadow: '0 4px 12px rgba(44,36,32,0.15)',
          }}
        >
          {book.coverPhoto ? (
            <img
              src={book.coverPhoto}
              alt={book.title}
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
          ) : (
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
              </svg>
            </div>
          )}
        </div>

        {/* Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1
            style={{
              fontFamily: 'Lora, serif',
              fontSize: '20px',
              fontWeight: 700,
              color: 'var(--text-primary)',
              margin: 0,
              lineHeight: 1.25,
              marginBottom: '6px',
            }}
          >
            {book.title}
          </h1>
          <p
            style={{
              fontFamily: 'DM Sans, sans-serif',
              fontSize: '14px',
              color: 'var(--text-secondary)',
              margin: 0,
              marginBottom: '10px',
            }}
          >
            {book.author}
          </p>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
            <span className="lang-badge">{(book.language || 'en').toUpperCase()}</span>
            <span
              style={{
                fontFamily: 'DM Sans, sans-serif',
                fontSize: '12px',
                color: 'var(--text-muted)',
              }}
            >
              {highlights.length} highlights
            </span>
            {favoriteCount > 0 && (
              <span
                style={{
                  fontFamily: 'DM Sans, sans-serif',
                  fontSize: '12px',
                  color: 'var(--accent-favorite)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '3px',
                }}
              >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
                {favoriteCount} fav
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Action bar */}
      <div
        style={{
          padding: '16px 20px',
          background: 'var(--bg-primary)',
          borderBottom: '1px solid var(--border)',
        }}
      >
        <button
          className="btn-primary"
          style={{ width: '100%' }}
          onClick={() => setShowAddManualModal(true)}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Add Quote
        </button>
      </div>

      {/* Search highlights */}
      {highlights.length > 0 && (
        <div style={{ padding: '16px 20px 0' }}>
          <div style={{ position: 'relative' }}>
            <svg
              width="14"
              height="14"
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
              style={{ paddingLeft: '34px', fontSize: '14px' }}
            />
          </div>
        </div>
      )}

      {/* Highlights list */}
      <div style={{ padding: '16px 20px 20px' }}>
        {filteredHighlights.length === 0 ? (
          searchQuery ? (
            <EmptyState
              title="No results"
              description={`No highlights match "${searchQuery}"`}
            />
          ) : (
            <EmptyState
              icon={
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5">
                  <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                </svg>
              }
              title="No quotes yet"
              description="Add your first quote from this book."
              action={
                <button
                  className="btn-primary"
                  onClick={() => setShowAddManualModal(true)}
                >
                  Add Quote
                </button>
              }
            />
          )
        ) : (
          filteredHighlights.map(highlight => (
            <HighlightCard
              key={highlight.id}
              highlight={highlight}
              onFavoriteToggle={handleFavoriteToggle}
              onDelete={handleDeleteHighlight}
              onEdit={handleEditHighlight}
              onTagAdd={handleTagAdd}
              onTagRemove={handleTagRemove}
              allTags={allTags}
              navigate={navigate}
            />
          ))
        )}
      </div>

      <ConfirmModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteBook}
        title="Delete Book"
        message={`Are you sure you want to delete "${book.title}"? This will also delete all ${highlights.length} highlight(s). This cannot be undone.`}
        confirmLabel="Delete Book"
        danger
      />

      {/* Add Quote Manually Modal */}
      <Modal
        isOpen={showAddManualModal}
        onClose={() => {
          setShowAddManualModal(false);
          setManualDraft({ markedText: '', fullContext: '', pageNumber: '' });
        }}
        title="Add Quote"
        footer={
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              className="btn-secondary"
              style={{ flex: 1 }}
              onClick={() => {
                setShowAddManualModal(false);
                setManualDraft({ markedText: '', fullContext: '', pageNumber: '' });
              }}
            >
              Cancel
            </button>
            <button
              className="btn-primary"
              style={{ flex: 1 }}
              onClick={handleAddManualSave}
              disabled={!manualDraft.markedText.trim()}
            >
              Save
            </button>
          </div>
        }
      >
        <div>
          <div style={{ marginBottom: '16px' }}>
            <label
              style={{
                display: 'block',
                fontFamily: 'DM Sans, sans-serif',
                fontSize: '13px',
                fontWeight: 600,
                color: 'var(--text-secondary)',
                marginBottom: '8px',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              Quote *
            </label>
            <textarea
              value={manualDraft.markedText}
              onChange={e => setManualDraft(d => ({ ...d, markedText: e.target.value }))}
              rows={5}
              autoFocus
              dir={bookDir}
              placeholder="Paste or type the quote here..."
              style={{
                width: '100%',
                fontFamily: 'Source Serif 4, serif',
                fontSize: '15px',
                lineHeight: 1.7,
                color: 'var(--text-primary)',
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                padding: '10px 12px',
                resize: 'vertical',
                outline: 'none',
                boxSizing: 'border-box',
                textAlign: bookRtl ? 'right' : 'left',
              }}
            />
          </div>
          <div style={{ marginBottom: '16px' }}>
            <label
              style={{
                display: 'block',
                fontFamily: 'DM Sans, sans-serif',
                fontSize: '13px',
                fontWeight: 600,
                color: 'var(--text-secondary)',
                marginBottom: '8px',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              Context (optional)
            </label>
            <textarea
              value={manualDraft.fullContext}
              onChange={e => setManualDraft(d => ({ ...d, fullContext: e.target.value }))}
              rows={3}
              dir={bookDir}
              placeholder="Surrounding passage for additional context..."
              style={{
                width: '100%',
                fontFamily: 'Source Serif 4, serif',
                fontSize: '13px',
                lineHeight: 1.65,
                color: 'var(--text-secondary)',
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                padding: '10px 12px',
                resize: 'vertical',
                outline: 'none',
                boxSizing: 'border-box',
                textAlign: bookRtl ? 'right' : 'left',
              }}
            />
          </div>
          <div>
            <label
              style={{
                display: 'block',
                fontFamily: 'DM Sans, sans-serif',
                fontSize: '13px',
                fontWeight: 600,
                color: 'var(--text-secondary)',
                marginBottom: '8px',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              Page Number (optional)
            </label>
            <input
              type="number"
              value={manualDraft.pageNumber}
              onChange={e => setManualDraft(d => ({ ...d, pageNumber: e.target.value }))}
              placeholder="e.g. 42"
              style={{
                width: '120px',
                fontFamily: 'DM Sans, sans-serif',
                fontSize: '14px',
                color: 'var(--text-primary)',
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                padding: '8px 12px',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>
        </div>
      </Modal>

      {/* Edit Book Modal */}
      <Modal
        isOpen={showEditBookModal}
        onClose={() => setShowEditBookModal(false)}
        title="Edit Book"
        footer={
          <div style={{ display: 'flex', gap: '12px' }}>
            <button className="btn-secondary" style={{ flex: 1 }} onClick={() => setShowEditBookModal(false)}>
              Cancel
            </button>
            <button
              className="btn-primary"
              style={{ flex: 1 }}
              onClick={handleEditBookSave}
              disabled={!editBookDraft?.title?.trim() || !editBookDraft?.author?.trim()}
            >
              Save
            </button>
          </div>
        }
      >
        {editBookDraft && (
          <div>
            {/* Cover photo */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontFamily: 'DM Sans, sans-serif', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Cover Photo
              </label>
              <label
                htmlFor="edit-cover-input"
                style={{
                  display: 'flex',
                  flexDirection: editBookCoverPreview ? 'row' : 'column',
                  alignItems: 'center',
                  justifyContent: editBookCoverPreview ? 'flex-start' : 'center',
                  gap: '16px',
                  padding: editBookCoverPreview ? '12px' : '24px',
                  background: 'var(--bg-secondary)',
                  border: '2px dashed var(--border)',
                  borderRadius: '12px',
                  cursor: 'pointer',
                }}
              >
                {editBookCoverPreview ? (
                  <>
                    <div style={{ width: '60px', height: '80px', borderRadius: '6px', overflow: 'hidden', flexShrink: 0, boxShadow: '0 2px 8px rgba(44,36,32,0.15)' }}>
                      <img src={editBookCoverPreview} alt="Cover" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                    </div>
                    <div>
                      <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '14px', color: 'var(--accent-primary)', margin: 0, fontWeight: 500 }}>Change cover photo</p>
                      <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: 'var(--text-muted)', margin: '2px 0 0' }}>Tap to select a different image</p>
                    </div>
                  </>
                ) : (
                  <div style={{ textAlign: 'center' }}>
                    <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '14px', color: 'var(--accent-primary)', margin: 0, fontWeight: 500 }}>Upload cover photo</p>
                    <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: 'var(--text-muted)', margin: '2px 0 0' }}>JPEG, PNG, WebP supported</p>
                  </div>
                )}
              </label>
              <input id="edit-cover-input" type="file" accept="image/*" onChange={handleEditBookCoverChange} style={{ display: 'none' }} />
            </div>

            {/* Title */}
            <div style={{ marginBottom: '16px' }}>
              <label htmlFor="edit-title" style={{ display: 'block', fontFamily: 'DM Sans, sans-serif', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Title
              </label>
              <input
                id="edit-title"
                type="text"
                className="input-field"
                value={editBookDraft.title}
                onChange={e => setEditBookDraft(d => ({ ...d, title: e.target.value }))}
                placeholder="Book title"
              />
            </div>

            {/* Author */}
            <div style={{ marginBottom: '16px' }}>
              <label htmlFor="edit-author" style={{ display: 'block', fontFamily: 'DM Sans, sans-serif', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Author
              </label>
              <input
                id="edit-author"
                type="text"
                className="input-field"
                value={editBookDraft.author}
                onChange={e => setEditBookDraft(d => ({ ...d, author: e.target.value }))}
                placeholder="Author name"
              />
            </div>

            {/* Language */}
            <div>
              <label style={{ display: 'block', fontFamily: 'DM Sans, sans-serif', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Language
              </label>
              <div style={{ display: 'flex', background: 'var(--bg-secondary)', borderRadius: '8px', padding: '4px', border: '1px solid var(--border)' }}>
                {[{ value: 'en', label: 'English' }, { value: 'he', label: 'Hebrew (עברית)' }].map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setEditBookDraft(d => ({ ...d, language: opt.value }))}
                    style={{
                      flex: 1,
                      padding: '10px 16px',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontFamily: 'DM Sans, sans-serif',
                      fontSize: '14px',
                      fontWeight: editBookDraft.language === opt.value ? 600 : 400,
                      background: editBookDraft.language === opt.value ? 'var(--bg-card)' : 'transparent',
                      color: editBookDraft.language === opt.value ? 'var(--accent-primary)' : 'var(--text-secondary)',
                      boxShadow: editBookDraft.language === opt.value ? '0 1px 4px rgba(44,36,32,0.1)' : 'none',
                      transition: 'all 200ms ease',
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

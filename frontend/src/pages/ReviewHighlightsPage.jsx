import React, { useState } from 'react';
import { addHighlight, addTag, getAllTags, getBook } from '../utils/storage.js';
import { getTextDirection } from '../utils/helpers.js';
import TagPill from '../components/TagPill.jsx';
import { InlineSpinner } from '../components/LoadingSpinner.jsx';

export default function ReviewHighlightsPage({ navigate, bookId, pendingHighlights }) {
  const [highlights, setHighlights] = useState(
    pendingHighlights.map(h => ({ ...h }))
  );
  const [isSaving, setIsSaving] = useState(false);
  const [globalTags] = useState(() => getAllTags());

  const book = getBook(bookId);

  if (!book) {
    navigate('library');
    return null;
  }

  if (pendingHighlights.length === 0) {
    navigate('book-detail', { bookId });
    return null;
  }

  const updateField = (id, field, value) => {
    setHighlights(prev =>
      prev.map(h => h.id === id ? { ...h, [field]: value, isEdited: true } : h)
    );
  };

  const deleteHighlight = (id) => {
    setHighlights(prev => prev.filter(h => h.id !== id));
  };

  const addTagToHighlight = (id, tag) => {
    setHighlights(prev =>
      prev.map(h => {
        if (h.id !== id) return h;
        const newTags = [...new Set([...(h.tags || []), tag.trim()])].filter(Boolean);
        return { ...h, tags: newTags };
      })
    );
    addTag(tag.trim());
  };

  const removeTagFromHighlight = (id, tag) => {
    setHighlights(prev =>
      prev.map(h =>
        h.id === id ? { ...h, tags: (h.tags || []).filter(t => t !== tag) } : h
      )
    );
  };

  const toggleFavorite = (id) => {
    setHighlights(prev =>
      prev.map(h => h.id === id ? { ...h, isFavorite: !h.isFavorite } : h)
    );
  };

  const handleSaveAll = async () => {
    if (highlights.length === 0) {
      navigate('book-detail', { bookId });
      return;
    }

    setIsSaving(true);
    try {
      for (const h of highlights) {
        if (h.markedText?.trim()) {
          addHighlight(h);
          // Add any new tags globally
          (h.tags || []).forEach(tag => addTag(tag));
        }
      }
      navigate('book-detail', { bookId });
    } catch (err) {
      console.error('Save error:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 20px',
          paddingTop: 'calc(16px + env(safe-area-inset-top, 0px))',
          background: 'var(--bg-primary)',
          borderBottom: '1px solid var(--border)',
          position: 'sticky',
          top: 0,
          zIndex: 10,
        }}
      >
        <button
          onClick={() => navigate('book-detail', { bookId })}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--accent-primary)',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
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
          Discard
        </button>
        <div style={{ textAlign: 'center' }}>
          <h1
            style={{
              fontFamily: 'Lora, serif',
              fontSize: '16px',
              fontWeight: 600,
              color: 'var(--text-primary)',
              margin: 0,
            }}
          >
            Review Highlights
          </h1>
          <p
            style={{
              fontFamily: 'DM Sans, sans-serif',
              fontSize: '11px',
              color: 'var(--text-muted)',
              margin: 0,
            }}
          >
            {highlights.length} extracted
          </p>
        </div>
        <button
          onClick={handleSaveAll}
          disabled={isSaving}
          className="btn-primary"
          style={{ padding: '8px 14px', fontSize: '13px' }}
        >
          {isSaving ? <InlineSpinner size={14} /> : 'Save All'}
        </button>
      </div>

      {/* Book info bar */}
      <div
        style={{
          padding: '10px 20px',
          background: 'var(--bg-secondary)',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
        }}
      >
        {book.coverPhoto && (
          <img
            src={book.coverPhoto}
            alt={book.title}
            style={{
              width: '28px',
              height: '40px',
              objectFit: 'cover',
              borderRadius: '3px',
              flexShrink: 0,
            }}
          />
        )}
        <div>
          <p
            style={{
              fontFamily: 'Lora, serif',
              fontSize: '13px',
              fontWeight: 600,
              color: 'var(--text-primary)',
              margin: 0,
            }}
          >
            {book.title}
          </p>
          <p
            style={{
              fontFamily: 'DM Sans, sans-serif',
              fontSize: '11px',
              color: 'var(--text-muted)',
              margin: 0,
            }}
          >
            by {book.author}
          </p>
        </div>
      </div>

      {/* Highlights list */}
      <div style={{ padding: '16px 20px 24px' }}>
        {highlights.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <p
              style={{
                fontFamily: 'DM Sans, sans-serif',
                fontSize: '15px',
                color: 'var(--text-secondary)',
              }}
            >
              All highlights have been removed.
            </p>
            <button
              className="btn-primary"
              onClick={() => navigate('book-detail', { bookId })}
              style={{ marginTop: '16px' }}
            >
              Back to Book
            </button>
          </div>
        ) : (
          highlights.map((highlight, index) => (
            <ReviewHighlightItem
              key={highlight.id}
              highlight={highlight}
              index={index}
              globalTags={globalTags}
              onUpdate={updateField}
              onDelete={deleteHighlight}
              onAddTag={addTagToHighlight}
              onRemoveTag={removeTagFromHighlight}
              onToggleFavorite={toggleFavorite}
            />
          ))
        )}
      </div>

      {/* Bottom save button */}
      {highlights.length > 0 && (
        <div
          style={{
            position: 'sticky',
            bottom: 'calc(64px + env(safe-area-inset-bottom, 0px))',
            left: 0,
            right: 0,
            padding: '16px 20px',
            background: 'linear-gradient(to top, var(--bg-primary) 80%, transparent)',
          }}
        >
          <button
            className="btn-primary"
            onClick={handleSaveAll}
            disabled={isSaving}
            style={{ width: '100%', fontSize: '15px', padding: '14px' }}
          >
            {isSaving ? (
              <>
                <InlineSpinner size={18} />
                Saving...
              </>
            ) : (
              <>
                Save {highlights.length} Highlight{highlights.length !== 1 ? 's' : ''}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}

function ReviewHighlightItem({
  highlight,
  index,
  globalTags,
  onUpdate,
  onDelete,
  onAddTag,
  onRemoveTag,
  onToggleFavorite,
}) {
  const [tagInput, setTagInput] = useState('');
  const [showTagInput, setShowTagInput] = useState(false);
  const [showPhoto, setShowPhoto] = useState(false);
  const dir = getTextDirection(highlight.markedText);
  const isRTL = dir === 'rtl';

  const handleAddTag = () => {
    const trimmed = tagInput.trim();
    if (trimmed) {
      onAddTag(highlight.id, trimmed);
      setTagInput('');
      setShowTagInput(false);
    }
  };

  return (
    <div
      className="card animate-fade-in"
      style={{
        marginBottom: '16px',
        padding: '16px',
        borderLeft: isRTL ? 'none' : '3px solid var(--accent-primary)',
        borderRight: isRTL ? '3px solid var(--accent-primary)' : 'none',
        direction: dir,
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '12px',
          flexDirection: isRTL ? 'row-reverse' : 'row',
        }}
      >
        <span
          style={{
            fontFamily: 'DM Sans, sans-serif',
            fontSize: '11px',
            fontWeight: 600,
            color: 'var(--text-muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}
        >
          Highlight {index + 1}
        </span>
        <div style={{ display: 'flex', gap: '4px', flexDirection: isRTL ? 'row-reverse' : 'row' }}>
          {/* Favorite toggle */}
          <button
            onClick={() => onToggleFavorite(highlight.id)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: highlight.isFavorite ? 'var(--accent-favorite)' : 'var(--text-muted)',
              padding: '6px',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill={highlight.isFavorite ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
          </button>
          {/* Delete */}
          <button
            onClick={() => onDelete(highlight.id)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-muted)',
              padding: '6px',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            onMouseEnter={e => { e.currentTarget.style.color = 'var(--danger)'; }}
            onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6l-1 14H6L5 6" />
              <path d="M10 11v6M14 11v6" />
              <path d="M9 6V4h6v2" />
            </svg>
          </button>
        </div>
      </div>

      {/* Marked text — editable */}
      <label
        style={{
          display: 'block',
          fontFamily: 'DM Sans, sans-serif',
          fontSize: '11px',
          fontWeight: 600,
          color: 'var(--text-secondary)',
          marginBottom: '6px',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          textAlign: isRTL ? 'right' : 'left',
        }}
      >
        Marked Text
      </label>
      <div style={{ position: 'relative' }}>
        <span style={{
          position: 'absolute',
          top: '-10px',
          right: isRTL ? '2px' : 'auto',
          left: isRTL ? 'auto' : '2px',
          fontSize: '52px',
          lineHeight: 1,
          color: 'var(--accent-primary)',
          opacity: 0.18,
          fontFamily: "'Noto Serif Hebrew', serif",
          pointerEvents: 'none',
          userSelect: 'none',
          zIndex: 0,
        }}>"</span>
        <textarea
          value={highlight.markedText}
          onChange={e => onUpdate(highlight.id, 'markedText', e.target.value)}
          className="input-field"
          style={{
            position: 'relative',
            zIndex: 1,
            marginBottom: '12px',
            fontFamily: isRTL ? "'Noto Serif Hebrew', serif" : 'Source Serif 4, serif',
            fontSize: '15px',
            minHeight: '80px',
            lineHeight: 1.7,
            direction: dir,
            textAlign: isRTL ? 'right' : 'left',
          }}
          placeholder="The marked text..."
        />
      </div>

      {/* Full context — editable */}
      <label
        style={{
          display: 'block',
          fontFamily: 'DM Sans, sans-serif',
          fontSize: '11px',
          fontWeight: 600,
          color: 'var(--text-secondary)',
          marginBottom: '6px',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          textAlign: isRTL ? 'right' : 'left',
        }}
      >
        Full Context
      </label>
      <textarea
        value={highlight.fullContext}
        onChange={e => onUpdate(highlight.id, 'fullContext', e.target.value)}
        className="input-field"
        style={{
          marginBottom: '12px',
          fontFamily: isRTL ? 'Assistant, sans-serif' : 'Source Serif 4, serif',
          fontSize: '13px',
          minHeight: '60px',
          color: 'var(--text-secondary)',
          direction: dir,
          textAlign: isRTL ? 'right' : 'left',
        }}
        placeholder="The surrounding paragraph..."
      />

      {/* Page number */}
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '12px', flexDirection: isRTL ? 'row-reverse' : 'row' }}>
        <label
          style={{
            fontFamily: 'DM Sans, sans-serif',
            fontSize: '13px',
            color: 'var(--text-secondary)',
            whiteSpace: 'nowrap',
          }}
        >
          Page:
        </label>
        <input
          type="number"
          value={highlight.pageNumber || ''}
          onChange={e => onUpdate(highlight.id, 'pageNumber', e.target.value ? parseInt(e.target.value) : null)}
          className="input-field"
          placeholder="—"
          style={{ width: '80px', textAlign: 'center' }}
        />
      </div>

      {/* Tags */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '6px',
          alignItems: 'center',
          marginBottom: '8px',
          flexDirection: isRTL ? 'row-reverse' : 'row',
        }}
      >
        {(highlight.tags || []).map(tag => (
          <TagPill
            key={tag}
            tag={tag}
            onRemove={() => onRemoveTag(highlight.id, tag)}
          />
        ))}
        {showTagInput ? (
          <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
            <input
              type="text"
              value={tagInput}
              onChange={e => setTagInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') handleAddTag();
                if (e.key === 'Escape') { setShowTagInput(false); setTagInput(''); }
              }}
              onBlur={() => { if (!tagInput.trim()) { setShowTagInput(false); } }}
              placeholder="tag"
              autoFocus
              list={`tags-${highlight.id}`}
              style={{
                border: '1px solid var(--accent-primary)',
                borderRadius: '20px',
                padding: '3px 10px',
                fontSize: '12px',
                fontFamily: 'DM Sans, sans-serif',
                color: 'var(--text-primary)',
                background: 'var(--bg-card)',
                outline: 'none',
                width: '90px',
              }}
            />
            <datalist id={`tags-${highlight.id}`}>
              {globalTags.map(t => <option key={t} value={t} />)}
            </datalist>
            <button
              onClick={handleAddTag}
              style={{
                background: 'var(--accent-primary)',
                border: 'none',
                borderRadius: '50%',
                width: '22px',
                height: '22px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: '14px',
                padding: 0,
              }}
            >
              ✓
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowTagInput(true)}
            className="tag-pill"
            style={{
              background: 'none',
              border: '1px dashed var(--border)',
              cursor: 'pointer',
              color: 'var(--text-muted)',
            }}
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            add tag
          </button>
        )}
      </div>

      {/* Show source photo */}
      {highlight.photoOriginal && (
        <div>
          <button
            onClick={() => setShowPhoto(v => !v)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontFamily: 'DM Sans, sans-serif',
              fontSize: '12px',
              color: 'var(--accent-secondary)',
              padding: '4px 0',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              flexDirection: isRTL ? 'row-reverse' : 'row',
            }}
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              style={{ transform: showPhoto ? 'rotate(180deg)' : 'none', transition: 'transform 200ms' }}
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
            {showPhoto ? 'Hide' : 'Show'} source photo
          </button>
          {showPhoto && (
            <div style={{ marginTop: '8px', borderRadius: '8px', overflow: 'hidden' }}>
              <img
                src={highlight.photoOriginal}
                alt="Source page"
                style={{ width: '100%', display: 'block', borderRadius: '8px' }}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

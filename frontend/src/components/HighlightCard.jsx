import React, { useState } from 'react';
import { formatDate, getTextDirection } from '../utils/helpers.js';
import TagPill from './TagPill.jsx';
import { ConfirmModal } from './Modal.jsx';

export default function HighlightCard({
  highlight,
  bookTitle,
  onFavoriteToggle,
  onDelete,
  onEdit,
  onTagAdd,
  onTagRemove,
  showBookTitle = false,
  navigate,
  allTags = [],
}) {
  const [showContext, setShowContext] = useState(false);
  const [showTagInput, setShowTagInput] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editDraft, setEditDraft] = useState({
    markedText: highlight.markedText || '',
    fullContext: highlight.fullContext || '',
    pageNumber: highlight.pageNumber || '',
  });

  const dir = getTextDirection(highlight.markedText);
  const isRTL = dir === 'rtl';

  const handleAddTag = () => {
    const trimmed = tagInput.trim();
    if (trimmed && onTagAdd) {
      onTagAdd(highlight.id, trimmed);
      setTagInput('');
      setShowTagInput(false);
    }
  };

  const handleTagKeyDown = (e) => {
    if (e.key === 'Enter') handleAddTag();
    if (e.key === 'Escape') {
      setShowTagInput(false);
      setTagInput('');
    }
  };

  const handleEditSave = () => {
    if (!editDraft.markedText.trim()) return;
    if (onEdit) {
      onEdit(highlight.id, {
        markedText: editDraft.markedText.trim(),
        fullContext: editDraft.fullContext.trim(),
        pageNumber: editDraft.pageNumber ? Number(editDraft.pageNumber) : null,
        isEdited: true,
      });
    }
    setIsEditing(false);
  };

  const handleEditCancel = () => {
    setEditDraft({
      markedText: highlight.markedText || '',
      fullContext: highlight.fullContext || '',
      pageNumber: highlight.pageNumber || '',
    });
    setIsEditing(false);
  };

  return (
    <div
      className="card animate-fade-in"
      style={{
        padding: '14px 16px',
        marginBottom: '12px',
        borderLeft: isRTL ? 'none' : '3px solid var(--accent-primary)',
        borderRight: isRTL ? '3px solid var(--accent-primary)' : 'none',
        direction: dir,
      }}
    >
      {/* Header row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          marginBottom: '8px',
          gap: '8px',
          flexDirection: isRTL ? 'row-reverse' : 'row',
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          {showBookTitle && bookTitle && (
            <button
              onClick={() => navigate && navigate('book-detail', { bookId: highlight.bookId })}
              style={{
                background: 'none',
                border: 'none',
                padding: 0,
                cursor: 'pointer',
                fontFamily: 'DM Sans, sans-serif',
                fontSize: '11px',
                fontWeight: 600,
                color: 'var(--accent-primary)',
                marginBottom: '6px',
                display: 'block',
                textAlign: isRTL ? 'right' : 'left',
              }}
            >
              {bookTitle}
            </button>
          )}
          {highlight.pageNumber && (
            <span
              style={{
                fontFamily: 'DM Sans, sans-serif',
                fontSize: '11px',
                color: 'var(--text-muted)',
                display: 'block',
                marginBottom: '4px',
                textAlign: isRTL ? 'right' : 'left',
              }}
            >
              p. {highlight.pageNumber}
            </span>
          )}
        </div>

        {/* Favorite button */}
        <button
          onClick={() => onFavoriteToggle && onFavoriteToggle(highlight.id, !highlight.isFavorite)}
          style={{
            background: 'none',
            border: 'none',
            padding: '4px',
            cursor: 'pointer',
            color: highlight.isFavorite ? 'var(--accent-favorite)' : 'var(--text-muted)',
            minWidth: '32px',
            minHeight: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '6px',
            flexShrink: 0,
            transition: 'color 200ms ease, background 200ms ease',
          }}
          aria-label={highlight.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill={highlight.isFavorite ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
        </button>
      </div>

      {/* Edit mode form */}
      {isEditing ? (
        <div style={{ marginBottom: '12px' }}>
          <div style={{ marginBottom: '10px' }}>
            <label style={{ display: 'block', fontFamily: 'DM Sans, sans-serif', fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px', textAlign: isRTL ? 'right' : 'left' }}>
              Quote
            </label>
            <textarea
              value={editDraft.markedText}
              onChange={e => setEditDraft(d => ({ ...d, markedText: e.target.value }))}
              rows={4}
              dir={dir}
              style={{
                width: '100%',
                fontFamily: isRTL ? "'Noto Serif Hebrew', serif" : 'Source Serif 4, serif',
                fontSize: '15px',
                lineHeight: 1.7,
                color: 'var(--text-primary)',
                background: 'var(--bg-secondary)',
                border: '1px solid var(--accent-primary)',
                borderRadius: '8px',
                padding: '10px 12px',
                resize: 'vertical',
                outline: 'none',
                boxSizing: 'border-box',
                direction: dir,
              }}
            />
          </div>
          <div style={{ marginBottom: '10px' }}>
            <label style={{ display: 'block', fontFamily: 'DM Sans, sans-serif', fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px', textAlign: isRTL ? 'right' : 'left' }}>
              Context (optional)
            </label>
            <textarea
              value={editDraft.fullContext}
              onChange={e => setEditDraft(d => ({ ...d, fullContext: e.target.value }))}
              rows={3}
              dir={dir}
              style={{
                width: '100%',
                fontFamily: isRTL ? 'Assistant, sans-serif' : 'Source Serif 4, serif',
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
                direction: dir,
              }}
            />
          </div>
          <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'block', fontFamily: 'DM Sans, sans-serif', fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px', textAlign: isRTL ? 'right' : 'left' }}>
              Page number (optional)
            </label>
            <input
              type="number"
              value={editDraft.pageNumber}
              onChange={e => setEditDraft(d => ({ ...d, pageNumber: e.target.value }))}
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
          <div style={{ display: 'flex', gap: '8px', direction: 'ltr' }}>
            <button
              onClick={handleEditSave}
              style={{
                flex: 1,
                background: 'var(--accent-primary)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                padding: '9px 16px',
                fontFamily: 'DM Sans, sans-serif',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Save
            </button>
            <button
              onClick={handleEditCancel}
              style={{
                flex: 1,
                background: 'var(--bg-secondary)',
                color: 'var(--text-secondary)',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                padding: '9px 16px',
                fontFamily: 'DM Sans, sans-serif',
                fontSize: '14px',
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Marked text */}
          <div style={{ position: 'relative', marginBottom: highlight.fullContext ? '8px' : '10px' }}>
            <span style={{
              position: 'absolute',
              top: '-14px',
              right: isRTL ? '0' : 'auto',
              left: isRTL ? 'auto' : '0',
              fontSize: '52px',
              lineHeight: 1,
              color: 'var(--accent-primary)',
              opacity: 0.15,
              fontFamily: "'Noto Serif Hebrew', serif",
              pointerEvents: 'none',
              userSelect: 'none',
            }}>"</span>
            <p
              style={{
                fontFamily: isRTL ? "'Noto Serif Hebrew', serif" : 'Source Serif 4, serif',
                fontSize: '16px',
                fontWeight: 400,
                color: 'var(--text-primary)',
                lineHeight: 1.75,
                margin: 0,
                paddingTop: '4px',
                textAlign: isRTL ? 'right' : 'left',
              }}
            >
              {highlight.markedText}
            </p>
          </div>

          {/* Show context toggle */}
          {highlight.fullContext && highlight.fullContext !== highlight.markedText && (
            <div style={{ marginBottom: '10px' }}>
              <button
                onClick={() => setShowContext(v => !v)}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  cursor: 'pointer',
                  fontFamily: 'DM Sans, sans-serif',
                  fontSize: '12px',
                  color: 'var(--accent-secondary)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  textAlign: isRTL ? 'right' : 'left',
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
                  style={{ transform: showContext ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 200ms' }}
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
                {showContext ? 'Hide context' : 'Show context'}
              </button>
              {showContext && (
                <p
                  style={{
                    fontFamily: isRTL ? 'Assistant, sans-serif' : 'Source Serif 4, serif',
                    fontSize: '13px',
                    color: 'var(--text-secondary)',
                    lineHeight: 1.65,
                    margin: '8px 0 0',
                    padding: '10px 12px',
                    background: 'var(--bg-secondary)',
                    borderRadius: '6px',
                    textAlign: isRTL ? 'right' : 'left',
                  }}
                >
                  {highlight.fullContext}
                </p>
              )}
            </div>
          )}
        </>
      )}

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
            onRemove={onTagRemove ? () => onTagRemove(highlight.id, tag) : undefined}
          />
        ))}
        {onTagAdd && (
          showTagInput ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <input
                type="text"
                value={tagInput}
                onChange={e => setTagInput(e.target.value)}
                onKeyDown={handleTagKeyDown}
                onBlur={() => {
                  if (!tagInput.trim()) {
                    setShowTagInput(false);
                  }
                }}
                placeholder="tag name"
                autoFocus
                list="tag-suggestions"
                style={{
                  border: '1px solid var(--accent-primary)',
                  borderRadius: '20px',
                  padding: '3px 10px',
                  fontSize: '12px',
                  fontFamily: 'DM Sans, sans-serif',
                  color: 'var(--text-primary)',
                  background: 'var(--bg-card)',
                  outline: 'none',
                  width: '100px',
                }}
              />
              <datalist id="tag-suggestions">
                {allTags.map(t => <option key={t} value={t} />)}
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
              tag
            </button>
          )
        )}
      </div>

      {/* Footer */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          direction: 'ltr',
        }}
      >
        <span
          style={{
            fontFamily: 'DM Sans, sans-serif',
            fontSize: '11px',
            color: 'var(--text-muted)',
          }}
        >
          {formatDate(highlight.dateAdded)}
          {highlight.isEdited && <span style={{ marginLeft: '4px' }}>· edited</span>}
        </span>

        <div style={{ display: 'flex', gap: '4px' }}>
          {onEdit && !isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              style={{
                background: 'none',
                border: 'none',
                padding: '4px 8px',
                cursor: 'pointer',
                fontFamily: 'DM Sans, sans-serif',
                fontSize: '11px',
                color: 'var(--text-muted)',
                display: 'flex',
                alignItems: 'center',
                gap: '3px',
                borderRadius: '4px',
              }}
              onMouseEnter={e => { e.currentTarget.style.color = 'var(--accent-primary)'; }}
              onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
              Edit
            </button>
          )}
          {onDelete && (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              style={{
                background: 'none',
                border: 'none',
                padding: '4px 8px',
                cursor: 'pointer',
                fontFamily: 'DM Sans, sans-serif',
                fontSize: '11px',
                color: 'var(--text-muted)',
                display: 'flex',
                alignItems: 'center',
                gap: '3px',
                borderRadius: '4px',
              }}
              onMouseEnter={e => { e.currentTarget.style.color = 'var(--danger)'; }}
              onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6l-1 14H6L5 6" />
                <path d="M10 11v6M14 11v6" />
                <path d="M9 6V4h6v2" />
              </svg>
              Delete
            </button>
          )}
        </div>
      </div>

      <ConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={() => onDelete && onDelete(highlight.id)}
        title="Delete Highlight"
        message="Are you sure you want to delete this highlight? This cannot be undone."
        confirmLabel="Delete"
        danger
      />
    </div>
  );
}

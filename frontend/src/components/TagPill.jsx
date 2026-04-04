import React from 'react';

export default function TagPill({ tag, onRemove, onClick, active = false }) {
  return (
    <span
      className="tag-pill"
      onClick={onClick}
      style={{
        cursor: onClick ? 'pointer' : 'default',
        background: active ? 'var(--accent-primary)' : 'var(--tag-bg)',
        color: active ? 'white' : 'var(--text-secondary)',
        transition: 'background 200ms, color 200ms',
      }}
    >
      {tag}
      {onRemove && (
        <button
          onClick={e => { e.stopPropagation(); onRemove(); }}
          style={{
            background: 'none',
            border: 'none',
            padding: 0,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'inherit',
            opacity: 0.6,
            marginLeft: '2px',
          }}
          aria-label={`Remove tag ${tag}`}
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      )}
    </span>
  );
}

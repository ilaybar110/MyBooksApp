import React from 'react';
import { truncateText } from '../utils/helpers.js';

export default function BookCard({ book, highlightCount, onClick }) {
  return (
    <button
      onClick={onClick}
      className="card w-full text-left overflow-hidden"
      style={{
        border: 'none',
        cursor: 'pointer',
        padding: 0,
        transition: 'transform 200ms ease, box-shadow 200ms ease',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = '0 4px 16px rgba(44,36,32,0.12)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = '0 2px 8px rgba(44,36,32,0.08)';
      }}
    >
      {/* Cover photo */}
      <div
        style={{
          width: '100%',
          aspectRatio: '2/3',
          background: 'var(--bg-secondary)',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        {book.coverPhoto ? (
          <img
            src={book.coverPhoto}
            alt={book.title}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              display: 'block',
            }}
          />
        ) : (
          <div
            style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'linear-gradient(135deg, var(--bg-secondary) 0%, var(--border) 100%)',
            }}
          >
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
            </svg>
          </div>
        )}
        {/* Language badge */}
        {book.language && (
          <div
            style={{
              position: 'absolute',
              top: '8px',
              right: '8px',
            }}
          >
            <span className="lang-badge">{book.language.toUpperCase()}</span>
          </div>
        )}
      </div>

      {/* Info */}
      <div style={{ padding: '10px 12px 12px' }}>
        <h3
          style={{
            fontFamily: 'Lora, serif',
            fontSize: '13px',
            fontWeight: 600,
            color: 'var(--text-primary)',
            margin: 0,
            lineHeight: 1.3,
            marginBottom: '3px',
          }}
          title={book.title}
        >
          {truncateText(book.title, 36)}
        </h3>
        <p
          style={{
            fontFamily: 'DM Sans, sans-serif',
            fontSize: '11px',
            color: 'var(--text-secondary)',
            margin: 0,
            marginBottom: '6px',
          }}
        >
          {truncateText(book.author, 28)}
        </p>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            color: 'var(--text-muted)',
          }}
        >
          <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
          </svg>
          <span
            style={{
              fontFamily: 'DM Sans, sans-serif',
              fontSize: '11px',
              fontWeight: 500,
            }}
          >
            {highlightCount || 0} highlight{(highlightCount || 0) !== 1 ? 's' : ''}
          </span>
        </div>
      </div>
    </button>
  );
}

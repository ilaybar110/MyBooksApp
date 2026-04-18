import React, { useRef, useState, useEffect } from 'react';
import { isHebrew, getTextDirection } from '../utils/helpers.js';

export default function DailyCarousel({ highlights, books, navigate }) {
  const scrollRef = useRef(null);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const container = scrollRef.current;
    if (!container || !highlights.length) return;
    const cards = Array.from(container.children);
    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            setActiveIndex(cards.indexOf(entry.target));
          }
        });
      },
      { root: container, threshold: 0.6 }
    );
    cards.forEach(card => observer.observe(card));
    return () => observer.disconnect();
  }, [highlights]);

  const scrollToCard = (index) => {
    const container = scrollRef.current;
    if (!container) return;
    const card = container.children[index];
    if (card) card.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'start' });
  };

  if (!highlights.length) return null;

  return (
    <div style={{ marginBottom: '20px' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
        <p style={{ margin: 0, fontSize: '10px', fontWeight: 700, color: '#C4933A', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          ✦ Highlights of the Day
        </p>
        {highlights.length > 1 && (
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'DM Sans, sans-serif' }}>
            {activeIndex + 1} / {highlights.length}
          </span>
        )}
      </div>

      {/* Scroll container */}
      <div
        ref={scrollRef}
        style={{
          display: 'flex',
          overflowX: 'auto',
          scrollSnapType: 'x mandatory',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          borderRadius: '14px',
          gap: '0',
        }}
      >
        {highlights.map((h) => {
          const book = books.find(b => b.id === h.bookId);
          const hebrew = isHebrew(h.markedText);
          return (
            <div
              key={h.id}
              onClick={() => navigate('highlights', { highlightId: h.id })}
              role="button"
              tabIndex={0}
              onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') navigate('highlights', { highlightId: h.id }); }}
              aria-label="View highlight in highlights section"
              style={{
                flex: '0 0 100%',
                scrollSnapAlign: 'start',
                boxSizing: 'border-box',
                cursor: 'pointer',
                background: 'linear-gradient(135deg, rgba(196,147,58,0.09) 0%, rgba(196,147,58,0.04) 100%)',
                border: '1px solid rgba(196,147,58,0.22)',
                borderRadius: '14px',
                padding: '20px 18px 16px',
                position: 'relative',
                overflow: 'hidden',
                transition: 'opacity 150ms',
              }}
              onMouseEnter={e => e.currentTarget.style.opacity = '0.8'}
              onMouseLeave={e => e.currentTarget.style.opacity = '1'}
            >
              {/* Decorative quote mark */}
              <span style={{
                position: 'absolute',
                top: '6px',
                left: hebrew ? undefined : '12px',
                right: hebrew ? '12px' : undefined,
                fontSize: '64px',
                lineHeight: 1,
                color: '#C4933A',
                opacity: 0.12,
                fontFamily: 'Lora, Georgia, serif',
                userSelect: 'none',
                pointerEvents: 'none',
                fontStyle: 'normal',
              }}>
                "
              </span>

              {/* Quote text */}
              <p style={{
                margin: '0 0 14px',
                paddingTop: '10px',
                fontSize: '17px',
                lineHeight: 1.75,
                color: 'var(--text-primary)',
                fontFamily: hebrew ? 'Noto Serif Hebrew, serif' : 'Lora, Georgia, serif',
                fontStyle: 'italic',
                direction: getTextDirection(h.markedText),
                textAlign: hebrew ? 'right' : 'left',
              }}>
                {h.markedText}
              </p>

              {/* Book byline */}
              {book && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', direction: hebrew ? 'rtl' : 'ltr' }}>
                  <div style={{ flex: 1, height: '1px', background: 'rgba(196,147,58,0.25)' }} />
                  <button
                    onClick={e => { e.stopPropagation(); navigate('book-detail', { bookId: book.id }); }}
                    style={{
                      background: 'none',
                      border: 'none',
                      padding: 0,
                      cursor: 'pointer',
                      fontSize: '11px',
                      color: 'var(--text-muted)',
                      fontFamily: 'DM Sans, sans-serif',
                      fontWeight: 500,
                      letterSpacing: '0.02em',
                      flexShrink: 0,
                      maxWidth: '60%',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {book.title}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Dot indicators */}
      {highlights.length > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', marginTop: '10px' }}>
          {highlights.map((_, i) => (
            <button
              key={i}
              onClick={() => scrollToCard(i)}
              aria-label={`Go to highlight ${i + 1}`}
              style={{
                width: i === activeIndex ? '18px' : '6px',
                height: '6px',
                borderRadius: '3px',
                border: 'none',
                padding: 0,
                cursor: 'pointer',
                background: i === activeIndex ? '#C4933A' : 'rgba(196,147,58,0.3)',
                transition: 'all 250ms ease',
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

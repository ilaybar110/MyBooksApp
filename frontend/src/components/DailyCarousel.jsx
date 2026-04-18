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
    <div style={{ marginBottom: '18px' }}>
      <p style={{ margin: '0 0 10px', fontSize: '10px', fontWeight: 700, color: '#C4933A', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
        Highlights of the Day
      </p>
      <div
        ref={scrollRef}
        style={{
          display: 'flex',
          overflowX: 'auto',
          scrollSnapType: 'x mandatory',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          borderRadius: '8px',
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
                padding: '14px 16px',
                background: 'rgba(196,147,58,0.06)',
                borderLeft: '3px solid #C4933A',
                boxSizing: 'border-box',
                cursor: 'pointer',
              }}
            >
              <p style={{
                margin: '0 0 10px',
                fontSize: '18px',
                lineHeight: 1.7,
                color: 'var(--text-primary)',
                direction: getTextDirection(h.markedText),
                textAlign: hebrew ? 'right' : 'left',
                fontFamily: hebrew ? 'serif' : undefined,
              }}>
                {h.markedText}
              </p>
              {book && (
                <button
                  onClick={e => { e.stopPropagation(); navigate('book-detail', { bookId: book.id }); }}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    cursor: 'pointer',
                    fontSize: '12px',
                    color: 'var(--accent-primary)',
                    fontFamily: 'DM Sans, sans-serif',
                    fontWeight: 500,
                  }}
                >
                  — {book.title}
                </button>
              )}
            </div>
          );
        })}
      </div>
      {highlights.length > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', marginTop: '10px' }}>
          {highlights.map((_, i) => (
            <button
              key={i}
              onClick={() => scrollToCard(i)}
              aria-label={`Go to highlight ${i + 1}`}
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                border: 'none',
                padding: 0,
                cursor: 'pointer',
                background: i === activeIndex ? '#C4933A' : 'rgba(196,147,58,0.3)',
                transition: 'background 150ms',
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

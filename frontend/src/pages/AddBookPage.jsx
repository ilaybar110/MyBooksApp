import React, { useState } from 'react';
import { addBook } from '../utils/storage.js';
import { generateId, compressImage, fileToBase64 } from '../utils/helpers.js';
import { InlineSpinner } from '../components/LoadingSpinner.jsx';

export default function AddBookPage({ navigate }) {
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [language, setLanguage] = useState('en');
  const [coverPreview, setCoverPreview] = useState(null);
  const [coverData, setCoverData] = useState(null);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCoverChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const base64 = await fileToBase64(file);
      const compressed = await compressImage(base64, 600, 0.8);
      setCoverData(compressed);
      setCoverPreview(compressed);
      setErrors(prev => ({ ...prev, cover: null }));
    } catch (err) {
      setErrors(prev => ({ ...prev, cover: 'Failed to process image' }));
    }
  };

  const validate = () => {
    const newErrors = {};
    if (!title.trim()) newErrors.title = 'Title is required';
    if (!author.trim()) newErrors.author = 'Author is required';
    if (!coverData) newErrors.cover = 'Cover photo is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      const book = addBook({
        id: generateId(),
        title: title.trim(),
        author: author.trim(),
        coverPhoto: coverData,
        language,
        tags: [],
        highlights: [],
        dateAdded: new Date().toISOString(),
      });
      navigate('book-detail', { bookId: book.id });
    } catch (err) {
      setErrors({ submit: err.message || 'Failed to add book' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
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
          onClick={() => navigate('library')}
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
          Cancel
        </button>
        <h1
          style={{
            fontFamily: 'Lora, serif',
            fontSize: '18px',
            fontWeight: 600,
            color: 'var(--text-primary)',
            margin: 0,
            flex: 1,
            textAlign: 'center',
          }}
        >
          Add New Book
        </h1>
        <div style={{ width: '70px' }} />
      </div>

      <form onSubmit={handleSubmit} style={{ padding: '24px 20px' }}>
        {/* Cover photo */}
        <div style={{ marginBottom: '24px' }}>
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
            Cover Photo <span style={{ color: 'var(--danger)' }}>*</span>
          </label>

          <label
            htmlFor="cover-input"
            style={{
              display: 'flex',
              flexDirection: coverPreview ? 'row' : 'column',
              alignItems: 'center',
              justifyContent: coverPreview ? 'flex-start' : 'center',
              gap: '16px',
              padding: coverPreview ? '12px' : '32px',
              background: 'var(--bg-secondary)',
              border: `2px dashed ${errors.cover ? 'var(--danger)' : 'var(--border)'}`,
              borderRadius: '12px',
              cursor: 'pointer',
              transition: 'border-color 200ms',
            }}
          >
            {coverPreview ? (
              <>
                <div
                  style={{
                    width: '72px',
                    height: '96px',
                    borderRadius: '6px',
                    overflow: 'hidden',
                    flexShrink: 0,
                    boxShadow: '0 2px 8px rgba(44,36,32,0.15)',
                  }}
                >
                  <img
                    src={coverPreview}
                    alt="Cover preview"
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                  />
                </div>
                <div>
                  <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '14px', color: 'var(--accent-primary)', margin: 0, fontWeight: 500 }}>
                    Change cover photo
                  </p>
                  <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: 'var(--text-muted)', margin: '2px 0 0' }}>
                    Tap to select a different image
                  </p>
                </div>
              </>
            ) : (
              <>
                <div
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '50%',
                    background: 'var(--border)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.8">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <polyline points="21 15 16 10 5 21" />
                  </svg>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '14px', color: 'var(--accent-primary)', margin: 0, fontWeight: 500 }}>
                    Upload cover photo
                  </p>
                  <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: 'var(--text-muted)', margin: '2px 0 0' }}>
                    JPEG, PNG, WebP supported
                  </p>
                </div>
              </>
            )}
          </label>
          <input
            id="cover-input"
            type="file"
            accept="image/*"
            onChange={handleCoverChange}
            style={{ display: 'none' }}
          />
          {errors.cover && (
            <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: 'var(--danger)', margin: '6px 0 0' }}>
              {errors.cover}
            </p>
          )}
        </div>

        {/* Title */}
        <div style={{ marginBottom: '20px' }}>
          <label
            htmlFor="title"
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
            Title <span style={{ color: 'var(--danger)' }}>*</span>
          </label>
          <input
            id="title"
            type="text"
            className="input-field"
            placeholder="Book title"
            value={title}
            onChange={e => { setTitle(e.target.value); setErrors(p => ({ ...p, title: null })); }}
            style={{ borderColor: errors.title ? 'var(--danger)' : undefined }}
          />
          {errors.title && (
            <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: 'var(--danger)', margin: '6px 0 0' }}>
              {errors.title}
            </p>
          )}
        </div>

        {/* Author */}
        <div style={{ marginBottom: '20px' }}>
          <label
            htmlFor="author"
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
            Author <span style={{ color: 'var(--danger)' }}>*</span>
          </label>
          <input
            id="author"
            type="text"
            className="input-field"
            placeholder="Author name"
            value={author}
            onChange={e => { setAuthor(e.target.value); setErrors(p => ({ ...p, author: null })); }}
            style={{ borderColor: errors.author ? 'var(--danger)' : undefined }}
          />
          {errors.author && (
            <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: 'var(--danger)', margin: '6px 0 0' }}>
              {errors.author}
            </p>
          )}
        </div>

        {/* Language */}
        <div style={{ marginBottom: '32px' }}>
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
            Book Language
          </label>
          <div
            style={{
              display: 'flex',
              background: 'var(--bg-secondary)',
              borderRadius: '8px',
              padding: '4px',
              border: '1px solid var(--border)',
            }}
          >
            {[
              { value: 'en', label: 'English' },
              { value: 'he', label: 'Hebrew (עברית)' },
            ].map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setLanguage(opt.value)}
                style={{
                  flex: 1,
                  padding: '10px 16px',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontFamily: 'DM Sans, sans-serif',
                  fontSize: '14px',
                  fontWeight: language === opt.value ? 600 : 400,
                  background: language === opt.value ? 'var(--bg-card)' : 'transparent',
                  color: language === opt.value ? 'var(--accent-primary)' : 'var(--text-secondary)',
                  boxShadow: language === opt.value ? '0 1px 4px rgba(44,36,32,0.1)' : 'none',
                  transition: 'all 200ms ease',
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {errors.submit && (
          <div
            style={{
              background: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '8px',
              padding: '12px 16px',
              marginBottom: '20px',
              fontFamily: 'DM Sans, sans-serif',
              fontSize: '14px',
              color: 'var(--danger)',
            }}
          >
            {errors.submit}
          </div>
        )}

        <button
          type="submit"
          className="btn-primary"
          disabled={isSubmitting}
          style={{ width: '100%', fontSize: '16px', padding: '14px' }}
        >
          {isSubmitting ? (
            <>
              <InlineSpinner size={18} />
              Adding Book...
            </>
          ) : (
            'Add Book to Library'
          )}
        </button>
      </form>
    </div>
  );
}

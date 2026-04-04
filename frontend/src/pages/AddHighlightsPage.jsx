import React, { useState } from 'react';
import { getBook, getApiKey } from '../utils/storage.js';
import { fileToBase64, compressImage, generateId } from '../utils/helpers.js';
import { InlineSpinner } from '../components/LoadingSpinner.jsx';

const GEMINI_MODELS = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-2.0-flash-lite'];
const GEMINI_API_VERSION = 'v1beta';

console.log(`[Gemini] Initializing with model sequence: ${GEMINI_MODELS.join(' → ')} (${GEMINI_API_VERSION} endpoint)`);

function geminiUrl(model, apiKey) {
  return `https://generativelanguage.googleapis.com/${GEMINI_API_VERSION}/models/${model}:generateContent?key=${apiKey}`;
}

function buildPrompt(language) {
  const isHebrew = language === 'he';
  return `You are analyzing a photograph of a book page. The user has marked certain sentences using a pencil to draw a vertical line or bracket along the RIGHT margin of the text — beside the lines they want to highlight. ${isHebrew ? 'This is a Hebrew book — text reads right to left, so the RIGHT side of the page is where each line begins, and the pencil marks appear in the RIGHT margin next to the marked text.' : 'Look for pencil marks in the right margin next to lines of text.'}

IMPORTANT:
- The marks are PENCIL LINES or BRACKETS drawn vertically in the margin on the RIGHT side of the text block.
- Do NOT look for underlines beneath the text.
- Do NOT look for highlighting or color marks.
- Do NOT look for marks on the left side.
- The pencil line runs vertically beside one or more lines of text on the RIGHT, indicating those lines are the quote.

Your task:
1. Identify ALL text that has a pencil mark in the RIGHT margin beside it
2. For each marked section, extract:
   - "markedText": The exact sentence(s) beside the pencil mark, transcribed precisely in the original language
   - "fullContext": The paragraph(s) that appear before and after the marked text on the page. Do not repeat the marked sentences — only include the surrounding text that gives the reader context for the quote.
   - "pageNumber": The page number if visible on the page, otherwise null

Language: ${isHebrew ? 'The text is in Hebrew. Preserve Hebrew script exactly.' : 'The text may be in English or Hebrew. Preserve the original language.'}

Return ONLY valid JSON in this exact format, no other text:
{
  "highlights": [
    {
      "markedText": "...",
      "fullContext": "...",
      "pageNumber": null
    }
  ]
}

If no right-margin pencil marks are detected, return: {"highlights": []}`;
}

export default function AddHighlightsPage({ navigate, bookId }) {
  const [photos, setPhotos] = useState([]); // [{id, file, preview, status, result, error}]
  const [isProcessing, setIsProcessing] = useState(false);

  const book = getBook(bookId);

  if (!book) {
    navigate('library');
    return null;
  }

  const handleFilesSelected = async (files) => {
    const fileArray = Array.from(files);
    const newPhotos = await Promise.all(
      fileArray.map(async (file) => {
        const base64 = await fileToBase64(file);
        return {
          id: generateId(),
          file,
          preview: base64,
          status: 'pending', // pending | processing | done | error
          result: null,
          error: null,
        };
      })
    );
    setPhotos(prev => [...prev, ...newPhotos]);
  };

  const handleRemovePhoto = (id) => {
    setPhotos(prev => prev.filter(p => p.id !== id));
  };

  const analyzePhoto = async (photo) => {
    const apiKey = getApiKey();
    if (!apiKey) {
      throw new Error('No API key set. Add your Gemini API key in Settings.');
    }

    // Compress before sending
    const compressed = await compressImage(photo.preview, 1200, 0.85);

    const mimeMatch = compressed.match(/^data:(image\/[a-z]+);base64,/);
    const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';
    const base64Data = compressed.replace(/^data:image\/[a-z]+;base64,/, '');

    const requestBody = JSON.stringify({
      contents: [
        {
          parts: [
            { inline_data: { mime_type: mimeType, data: base64Data } },
            { text: buildPrompt(book.language || 'en') },
          ],
        },
      ],
      generationConfig: { temperature: 0.1, maxOutputTokens: 8192 },
    });

    let lastError = null;

    for (const model of GEMINI_MODELS) {
      console.log(`[Gemini] Trying model: ${model} (${GEMINI_API_VERSION}), image mime: ${mimeType}`);

      let response;
      try {
        response = await fetch(geminiUrl(model, apiKey), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: requestBody,
        });
      } catch (networkErr) {
        console.error('[Gemini] Network error:', networkErr);
        console.log('Current API Key being used (first 5 chars):', apiKey.substring(0, 5));
        throw new Error(`Network error: ${networkErr.message}`);
      }

      if (!response.ok) {
        let errBody = {};
        try { errBody = await response.json(); } catch (_) {}
        console.error(`[Gemini] Model ${model} error response:`, JSON.stringify(errBody, null, 2));
        console.log('Current API Key being used (first 5 chars):', apiKey.substring(0, 5));

        const msg = errBody.error?.message || `HTTP ${response.status}`;

        // 404 means this model alias isn't available — try the next one
        if (response.status === 404) {
          lastError = new Error(`Model not found (404): ${model} — ${msg}`);
          console.warn(`[Gemini] ${model} not found, trying next...`);
          continue;
        }
        if (response.status === 400) throw new Error(`Bad request (400): ${msg} — check your API key in Settings.`);
        // limit:0 means free-tier quota is zero for this model/region — try next model
        if (response.status === 429 && msg.includes('limit: 0')) {
          lastError = new Error(`Free tier unavailable (429): ${model} — ${msg}`);
          console.warn(`[Gemini] ${model} has limit:0 on free tier, trying next...`);
          continue;
        }
        if (response.status === 429) throw new Error(`Quota/rate limit (429): ${msg}`);
        throw new Error(`API error ${response.status}: ${msg}`);
      }

      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '{"highlights":[]}';
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return { highlights: [] };
      return JSON.parse(jsonMatch[0]);
    }

    // All models exhausted
    console.log('Current API Key being used (first 5 chars):', apiKey.substring(0, 5));
    throw lastError || new Error('All Gemini model variants failed.');
  };

  const handleProcessAll = async () => {
    const pendingPhotos = photos.filter(p => p.status === 'pending');
    if (pendingPhotos.length === 0) return;

    setIsProcessing(true);

    // Process one at a time
    for (const photo of pendingPhotos) {
      setPhotos(prev =>
        prev.map(p => p.id === photo.id ? { ...p, status: 'processing' } : p)
      );

      try {
        const result = await analyzePhoto(photo);
        setPhotos(prev =>
          prev.map(p => p.id === photo.id ? { ...p, status: 'done', result } : p)
        );
      } catch (err) {
        setPhotos(prev =>
          prev.map(p => p.id === photo.id ? { ...p, status: 'error', error: err.message } : p)
        );
      }
    }

    setIsProcessing(false);
  };

  const handleRetry = async (photo) => {
    setPhotos(prev => prev.map(p => p.id === photo.id ? { ...p, status: 'processing', error: null } : p));
    try {
      const result = await analyzePhoto(photo);
      setPhotos(prev => prev.map(p => p.id === photo.id ? { ...p, status: 'done', result } : p));
    } catch (err) {
      setPhotos(prev => prev.map(p => p.id === photo.id ? { ...p, status: 'error', error: err.message } : p));
    }
  };

  const handleContinue = () => {
    // Collect all highlights from done photos
    const pendingHighlights = [];
    photos.forEach(photo => {
      if (photo.status === 'done' && photo.result?.highlights) {
        photo.result.highlights.forEach(h => {
          pendingHighlights.push({
            id: generateId(),
            bookId,
            markedText: h.markedText || '',
            fullContext: h.fullContext || '',
            pageNumber: h.pageNumber || null,
            photoOriginal: photo.preview,
            isFavorite: false,
            tags: [],
            dateAdded: new Date().toISOString(),
            isEdited: false,
          });
        });
      }
    });

    navigate('review-highlights', { bookId, pendingHighlights });
  };

  const doneCount = photos.filter(p => p.status === 'done').length;
  const errorCount = photos.filter(p => p.status === 'error').length;
  const pendingCount = photos.filter(p => p.status === 'pending').length;
  const processingCount = photos.filter(p => p.status === 'processing').length;
  const totalHighlights = photos
    .filter(p => p.status === 'done')
    .reduce((sum, p) => sum + (p.result?.highlights?.length || 0), 0);

  const allDone = photos.length > 0 && pendingCount === 0 && processingCount === 0;

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
          Back
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
            Add Highlights
          </h1>
          <p
            style={{
              fontFamily: 'DM Sans, sans-serif',
              fontSize: '11px',
              color: 'var(--text-muted)',
              margin: 0,
            }}
          >
            {book.title}
          </p>
        </div>
        <div style={{ width: '60px' }} />
      </div>

      <div style={{ padding: '20px' }}>
        {/* Instructions */}
        <div
          style={{
            background: 'var(--bg-card)',
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '20px',
            boxShadow: '0 2px 8px rgba(44,36,32,0.06)',
          }}
        >
          <h2
            style={{
              fontFamily: 'DM Sans, sans-serif',
              fontSize: '14px',
              fontWeight: 600,
              color: 'var(--text-primary)',
              margin: '0 0 8px',
            }}
          >
            How to use
          </h2>
          <ul
            style={{
              fontFamily: 'DM Sans, sans-serif',
              fontSize: '13px',
              color: 'var(--text-secondary)',
              margin: 0,
              paddingLeft: '18px',
              lineHeight: 1.7,
            }}
          >
            <li>Take clear photos of book pages with pencil lines in the right margin next to text</li>
            <li>Select multiple pages at once or take them one by one</li>
            <li>AI will extract all marked passages automatically</li>
          </ul>
        </div>

        {/* Photo input buttons */}
        <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
          <label
            htmlFor="photo-file-input"
            className="btn-secondary"
            style={{ flex: 1, cursor: 'pointer', justifyContent: 'center' }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
            Choose Photos
          </label>
          <label
            htmlFor="photo-camera-input"
            className="btn-primary"
            style={{ flex: 1, cursor: 'pointer', justifyContent: 'center' }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
              <circle cx="12" cy="13" r="4" />
            </svg>
            Take Photo
          </label>
        </div>

        <input
          id="photo-file-input"
          type="file"
          accept="image/*"
          multiple
          onChange={e => handleFilesSelected(e.target.files)}
          style={{ display: 'none' }}
        />
        <input
          id="photo-camera-input"
          type="file"
          accept="image/*"
          capture="environment"
          onChange={e => handleFilesSelected(e.target.files)}
          style={{ display: 'none' }}
        />

        {/* Photo queue */}
        {photos.length > 0 && (
          <div style={{ marginBottom: '20px' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '12px',
              }}
            >
              <h3
                style={{
                  fontFamily: 'DM Sans, sans-serif',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: 'var(--text-secondary)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  margin: 0,
                }}
              >
                Queue ({photos.length} photo{photos.length !== 1 ? 's' : ''})
              </h3>
              {doneCount > 0 && (
                <span
                  style={{
                    fontFamily: 'DM Sans, sans-serif',
                    fontSize: '12px',
                    color: '#16a34a',
                    fontWeight: 500,
                  }}
                >
                  {totalHighlights} highlight{totalHighlights !== 1 ? 's' : ''} found
                </span>
              )}
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '10px',
              }}
            >
              {photos.map(photo => (
                <div
                  key={photo.id}
                  style={{
                    position: 'relative',
                    borderRadius: '8px',
                    overflow: 'hidden',
                    aspectRatio: '3/4',
                    background: 'var(--bg-secondary)',
                  }}
                >
                  <img
                    src={photo.preview}
                    alt="Page photo"
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                  />

                  {/* Status overlay */}
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background:
                        photo.status === 'processing' ? 'rgba(44,36,32,0.55)' :
                        photo.status === 'done' ? 'rgba(22,163,74,0.2)' :
                        photo.status === 'error' ? 'rgba(192,57,43,0.5)' :
                        'transparent',
                      transition: 'background 300ms',
                    }}
                  >
                    {photo.status === 'processing' && (
                      <div style={{ color: 'white' }}>
                        <InlineSpinner size={28} />
                      </div>
                    )}
                    {photo.status === 'done' && (
                      <div
                        style={{
                          background: '#16a34a',
                          borderRadius: '50%',
                          width: '32px',
                          height: '32px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'white',
                        }}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      </div>
                    )}
                    {photo.status === 'error' && (
                      <div style={{ color: 'white', textAlign: 'center', padding: '4px' }}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ display: 'block', margin: '0 auto 4px' }}>
                          <circle cx="12" cy="12" r="10" />
                          <line x1="12" y1="8" x2="12" y2="12" />
                          <line x1="12" y1="16" x2="12.01" y2="16" />
                        </svg>
                        <span style={{ fontSize: '9px', fontFamily: 'DM Sans', lineHeight: 1.2 }}>Error</span>
                      </div>
                    )}
                  </div>

                  {/* Highlight count badge */}
                  {photo.status === 'done' && photo.result?.highlights?.length > 0 && (
                    <div
                      style={{
                        position: 'absolute',
                        top: '6px',
                        left: '6px',
                        background: 'var(--accent-primary)',
                        color: 'white',
                        borderRadius: '10px',
                        padding: '2px 7px',
                        fontSize: '11px',
                        fontFamily: 'DM Sans, sans-serif',
                        fontWeight: 600,
                      }}
                    >
                      {photo.result.highlights.length}
                    </div>
                  )}

                  {/* Remove button (only for pending or error) */}
                  {(photo.status === 'pending' || photo.status === 'error') && (
                    <button
                      onClick={() => handleRemovePhoto(photo.id)}
                      style={{
                        position: 'absolute',
                        top: '4px',
                        right: '4px',
                        background: 'rgba(44,36,32,0.7)',
                        border: 'none',
                        borderRadius: '50%',
                        width: '22px',
                        height: '22px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        padding: 0,
                      }}
                    >
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  )}

                  {/* Retry button */}
                  {photo.status === 'error' && (
                    <button
                      onClick={() => handleRetry(photo)}
                      style={{
                        position: 'absolute',
                        bottom: '4px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        background: 'var(--accent-primary)',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '3px 8px',
                        cursor: 'pointer',
                        color: 'white',
                        fontSize: '10px',
                        fontFamily: 'DM Sans, sans-serif',
                        fontWeight: 500,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      Retry
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action buttons */}
        {photos.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {pendingCount > 0 && !isProcessing && (
              <button
                className="btn-primary"
                onClick={handleProcessAll}
                style={{ width: '100%', fontSize: '15px', padding: '14px' }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
                Process {pendingCount} Photo{pendingCount !== 1 ? 's' : ''} with AI
              </button>
            )}

            {isProcessing && (
              <button
                className="btn-primary"
                disabled
                style={{ width: '100%', fontSize: '15px', padding: '14px' }}
              >
                <InlineSpinner size={18} />
                Analyzing photos...
              </button>
            )}

            {allDone && totalHighlights > 0 && (
              <button
                className="btn-primary"
                onClick={handleContinue}
                style={{ width: '100%', fontSize: '15px', padding: '14px' }}
              >
                Review {totalHighlights} Highlight{totalHighlights !== 1 ? 's' : ''}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            )}

            {allDone && totalHighlights === 0 && (
              <div
                style={{
                  background: 'var(--bg-secondary)',
                  borderRadius: '12px',
                  padding: '16px',
                  textAlign: 'center',
                }}
              >
                <p
                  style={{
                    fontFamily: 'DM Sans, sans-serif',
                    fontSize: '14px',
                    color: 'var(--text-secondary)',
                    margin: 0,
                  }}
                >
                  No marked text detected. Make sure photos show clear pencil lines in the right margin beside the text.
                </p>
              </div>
            )}
          </div>
        )}

        {photos.length === 0 && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '40px 20px',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                width: '80px',
                height: '80px',
                borderRadius: '50%',
                background: 'var(--bg-secondary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '16px',
              }}
            >
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                <circle cx="12" cy="13" r="4" />
              </svg>
            </div>
            <p
              style={{
                fontFamily: 'DM Sans, sans-serif',
                fontSize: '15px',
                color: 'var(--text-secondary)',
                margin: 0,
                lineHeight: 1.5,
              }}
            >
              Select photos of book pages to begin extracting highlights
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

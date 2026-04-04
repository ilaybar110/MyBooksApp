import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';

export default function Modal({ isOpen, onClose, title, children, footer }) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return createPortal(
    <>
      {/* Backdrop + centering container */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.45)',
          zIndex: 50,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px',
          boxSizing: 'border-box',
        }}
      >
      {/* Modal */}
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '480px',
          background: 'var(--bg-card)',
          borderRadius: '18px',
          zIndex: 51,
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          direction: 'ltr',
          boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
        }}
      >

        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 20px 12px',
            borderBottom: '1px solid var(--border)',
            flexShrink: 0,
          }}
        >
          <h2
            style={{
              fontFamily: 'Lora, serif',
              fontSize: '18px',
              fontWeight: 600,
              color: 'var(--text-primary)',
              margin: 0,
            }}
          >
            {title}
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'var(--bg-secondary)',
              border: 'none',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-muted)',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div style={{ overflowY: 'auto', flex: 1, padding: '20px' }}>
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div
            style={{
              padding: '16px 20px',
              borderTop: '1px solid var(--border)',
              flexShrink: 0,
            }}
          >
            {footer}
          </div>
        )}
      </div>
      </div>
    </>,
    document.body
  );
}

export function ConfirmModal({ isOpen, onClose, onConfirm, title, message, confirmLabel = 'Confirm', danger = false }) {
  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      footer={
        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="btn-secondary" style={{ flex: 1 }} onClick={onClose}>
            Cancel
          </button>
          <button
            className={danger ? 'btn-danger' : 'btn-primary'}
            style={{ flex: 1 }}
            onClick={() => { onConfirm(); onClose(); }}
          >
            {confirmLabel}
          </button>
        </div>
      }
    >
      <p
        style={{
          fontFamily: 'DM Sans, sans-serif',
          fontSize: '15px',
          color: 'var(--text-secondary)',
          lineHeight: 1.5,
          margin: 0,
        }}
      >
        {message}
      </p>
    </Modal>
  );
}

import React, { useState, useCallback } from 'react';
import BottomNav from './components/BottomNav.jsx';
import LibraryPage from './pages/LibraryPage.jsx';
import AllHighlightsPage from './pages/AllHighlightsPage.jsx';
import BookDetailPage from './pages/BookDetailPage.jsx';
import AddBookPage from './pages/AddBookPage.jsx';
import SettingsPage from './pages/SettingsPage.jsx';

// Toast system
const _toastListeners = [];
export function showToast(msg, type = 'success', duration = 3000) {
  _toastListeners.forEach(fn => fn({ id: crypto.randomUUID(), msg, type, duration }));
}

function ToastContainer() {
  const [toasts, setToasts] = React.useState([]);
  React.useEffect(() => {
    const handler = (t) => {
      setToasts(p => [...p, t]);
      setTimeout(() => setToasts(p => p.filter(x => x.id !== t.id)), t.duration);
    };
    _toastListeners.push(handler);
    return () => {
      const i = _toastListeners.indexOf(handler);
      if (i > -1) _toastListeners.splice(i, 1);
    };
  }, []);
  if (!toasts.length) return null;
  return (
    <div style={{ position: 'fixed', bottom: 'calc(76px + env(safe-area-inset-bottom, 0px))', left: '50%', transform: 'translateX(-50%)', zIndex: 200, display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center', width: 'calc(100% - 40px)', maxWidth: '440px', pointerEvents: 'none' }}>
      {toasts.map(t => (
        <div key={t.id} style={{ background: t.type === 'error' ? '#b83232' : '#1a1615', color: 'white', borderRadius: '10px', padding: '11px 16px', fontSize: '13px', fontWeight: 500, boxShadow: '0 4px 16px rgba(26,22,21,0.25)', display: 'flex', alignItems: 'center', gap: '8px', width: '100%', pointerEvents: 'auto' }}>
          {t.type === 'error' ? '⚠' : '✓'} {t.msg}
        </div>
      ))}
    </div>
  );
}

const TAB_PAGES = ['library', 'highlights', 'settings'];

export default function App() {
  const [currentPage, setCurrentPage] = useState('library');
  const [pageParams, setPageParams] = useState({});
  const [activeTab, setActiveTab] = useState('library');

  const navigate = useCallback((page, params = {}) => {
    setCurrentPage(page);
    setPageParams(params);
    if (TAB_PAGES.includes(page)) setActiveTab(page);
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, []);

  const renderPage = () => {
    switch (currentPage) {
      case 'library':        return <LibraryPage navigate={navigate} />;
      case 'highlights':     return <AllHighlightsPage navigate={navigate} pageParams={pageParams} />;
      case 'settings':       return <SettingsPage navigate={navigate} />;
      case 'book-detail':    return <BookDetailPage navigate={navigate} bookId={pageParams.bookId} />;
      case 'add-book':       return <AddBookPage navigate={navigate} />;
      default:               return <LibraryPage navigate={navigate} />;
    }
  };

  return (
    <div className="page-container bg-[var(--bg-primary)]">
      <main
        className="w-full"
        style={{ paddingBottom: 'calc(64px + env(safe-area-inset-bottom, 0px))' }}
      >
        {renderPage()}
      </main>
      <BottomNav activeTab={activeTab} navigate={navigate} />
      <ToastContainer />
    </div>
  );
}

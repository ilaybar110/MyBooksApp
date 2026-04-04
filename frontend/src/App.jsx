import React, { useState, useCallback, useEffect } from 'react';
import { initStorage } from './utils/storage.js';
import BottomNav from './components/BottomNav.jsx';
import LibraryPage from './pages/LibraryPage.jsx';
import AllHighlightsPage from './pages/AllHighlightsPage.jsx';
import BookDetailPage from './pages/BookDetailPage.jsx';
import AddBookPage from './pages/AddBookPage.jsx';
import AddHighlightsPage from './pages/AddHighlightsPage.jsx';
import ReviewHighlightsPage from './pages/ReviewHighlightsPage.jsx';
import SettingsPage from './pages/SettingsPage.jsx';

// Pages with a tab
const TAB_PAGES = ['library', 'highlights', 'settings'];

export default function App() {
  const [currentPage, setCurrentPage] = useState('library');
  const [pageParams, setPageParams] = useState({});
  const [activeTab, setActiveTab] = useState('library');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    initStorage().then(() => setReady(true));
  }, []);

  const navigate = useCallback((page, params = {}) => {
    setCurrentPage(page);
    setPageParams(params);
    if (TAB_PAGES.includes(page)) {
      setActiveTab(page);
    }
    // Scroll to top on navigation
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, []);

  const renderPage = () => {
    switch (currentPage) {
      case 'library':
        return <LibraryPage navigate={navigate} />;
      case 'highlights':
        return <AllHighlightsPage navigate={navigate} />;
      case 'settings':
        return <SettingsPage navigate={navigate} />;
      case 'book-detail':
        return <BookDetailPage navigate={navigate} bookId={pageParams.bookId} />;
      case 'add-book':
        return <AddBookPage navigate={navigate} />;
      case 'add-highlights':
        return <AddHighlightsPage navigate={navigate} bookId={pageParams.bookId} />;
      case 'review-highlights':
        return (
          <ReviewHighlightsPage
            navigate={navigate}
            bookId={pageParams.bookId}
            pendingHighlights={pageParams.pendingHighlights || []}
          />
        );
      default:
        return <LibraryPage navigate={navigate} />;
    }
  };

  if (!ready) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--bg-primary)' }}>
      <div style={{ fontFamily: 'sans-serif', color: 'var(--text-muted)', fontSize: '14px' }}>Loading…</div>
    </div>
  );

  return (
    <div className="page-container bg-[var(--bg-primary)]">
      <main
        className="w-full"
        style={{ paddingBottom: 'calc(64px + env(safe-area-inset-bottom, 0px))' }}
      >
        {renderPage()}
      </main>
      <BottomNav activeTab={activeTab} navigate={navigate} />
    </div>
  );
}

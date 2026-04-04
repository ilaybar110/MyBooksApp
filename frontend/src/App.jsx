import React, { useState, useCallback } from 'react';
import BottomNav from './components/BottomNav.jsx';
import LibraryPage from './pages/LibraryPage.jsx';
import AllHighlightsPage from './pages/AllHighlightsPage.jsx';
import BookDetailPage from './pages/BookDetailPage.jsx';
import AddBookPage from './pages/AddBookPage.jsx';
import SettingsPage from './pages/SettingsPage.jsx';

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
      case 'highlights':     return <AllHighlightsPage navigate={navigate} />;
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
    </div>
  );
}

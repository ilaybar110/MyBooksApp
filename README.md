# BookMarks — Personal Reading Journal

A mobile-first web app to build a library of books, photograph pages with highlights, extract marked text using AI (Claude Vision), and manage your reading highlights.

---

## Prerequisites

- **Node.js** v18+ — https://nodejs.org/
- **An Anthropic API key** — https://console.anthropic.com/

---

## Setup

### 1. Clone / Open the project

The project is already set up at `C:\Users\uhp1m\Desktop\ilays\MyBooksApp\`

### 2. Backend setup

```bash
cd backend
npm install
cp .env.example .env
# Edit .env and add your ANTHROPIC_API_KEY
```

Your `.env` file should look like:
```
ANTHROPIC_API_KEY=sk-ant-...
PORT=3001
```

Start the backend:
```bash
npm run dev       # development (auto-restart)
# or
npm start         # production
```

Backend runs at: **http://localhost:3001**

### 3. Frontend setup

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at: **http://localhost:5173**

---

## Usage

1. Open **http://localhost:5173** on your phone or browser
2. **Library tab** — Add books with cover photos
3. **Book detail** — Tap "Add Highlights" to photograph pages
4. **AI extraction** — Select photos of pages with underlines/brackets, hit "Process with AI"
5. **Review** — Edit extracted text, add tags, mark favorites, save
6. **Highlights tab** — Browse all highlights with search and filters
7. **Settings tab** — Export/import data, manage tags

---

## Project Structure

```
MyBooksApp/
├── backend/
│   ├── server.js          # Express API server
│   ├── package.json
│   └── .env.example       # Copy to .env and add API key
└── frontend/
    ├── index.html
    ├── vite.config.js
    ├── tailwind.config.js
    ├── postcss.config.js
    ├── package.json
    └── src/
        ├── main.jsx
        ├── App.jsx           # State-based router
        ├── index.css         # CSS variables + global styles
        ├── components/
        │   ├── BottomNav.jsx
        │   ├── BookCard.jsx
        │   ├── HighlightCard.jsx
        │   ├── TagPill.jsx
        │   ├── LoadingSpinner.jsx
        │   ├── EmptyState.jsx
        │   └── Modal.jsx
        ├── pages/
        │   ├── LibraryPage.jsx
        │   ├── AllHighlightsPage.jsx
        │   ├── BookDetailPage.jsx
        │   ├── AddBookPage.jsx
        │   ├── AddHighlightsPage.jsx
        │   ├── ReviewHighlightsPage.jsx
        │   └── SettingsPage.jsx
        ├── hooks/
        │   └── useStorage.js
        └── utils/
            ├── storage.js    # localStorage CRUD
            └── helpers.js    # generateId, formatDate, compressImage, etc.
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Tailwind CSS + Vite |
| Backend | Node.js + Express |
| AI | Anthropic Claude Vision API (claude-opus-4-5) |
| Storage | localStorage (no auth, no cloud) |
| Languages | English + Hebrew (RTL) |

---

## Features

- **Library** — 2-column grid, cover photos, highlight counts, search + sort
- **Add Book** — Title, author, cover photo upload, EN/HE language toggle
- **Photograph & Extract** — Multiple photo queue, per-photo AI processing with status indicators
- **Review** — Inline editable text, tags, page numbers, favorites, source photo preview
- **Highlights Feed** — All highlights chronologically with search, filter by favorites/tag/book
- **Settings** — Export JSON, import JSON, clear data, manage tags (create/rename/delete)
- **RTL Support** — Hebrew books render right-to-left with appropriate fonts
- **Mobile-first** — Safe area insets, 44px touch targets, bottom sheet modals

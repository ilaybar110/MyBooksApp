# HOTD Navigate to Highlight Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tapping the Highlight of the Day card on the home page navigates to the Highlights tab, scrolls to that highlight, and briefly flashes it gold.

**Architecture:** Pass `{ highlightId }` through the existing `navigate('highlights', { highlightId })` call. `AllHighlightsPage` receives `pageParams`, builds a ref map for each card wrapper, and on mount uses `scrollIntoView` + a CSS keyframe animation to identify the target card.

**Tech Stack:** React (JSX), Vite, Tailwind CSS + custom CSS variables, localStorage

> **Note:** No test framework exists in this project. Each task uses manual browser verification instead of automated tests.

---

## File Map

| File | Change |
|------|--------|
| `frontend/src/pages/LibraryPage.jsx` | Make HOTD card clickable; navigate with highlightId |
| `frontend/src/App.jsx` | Pass `pageParams` to `AllHighlightsPage` |
| `frontend/src/pages/AllHighlightsPage.jsx` | Accept `pageParams`, build ref map, scroll+flash on mount |
| `frontend/src/index.css` | Add `@keyframes hotd-flash` and `.hotd-flash` class |

---

### Task 1: Add gold flash CSS animation

**Files:**
- Modify: `frontend/src/index.css`

- [ ] **Step 1: Add the keyframe and class after the existing `@keyframes shimmer` block (around line 282)**

  Open `frontend/src/index.css` and append after the `shimmer` animation block:

  ```css
  @keyframes hotd-flash {
    0%   { box-shadow: 0 0 0 0 rgba(196, 147, 58, 0); }
    20%  { box-shadow: 0 0 0 8px rgba(196, 147, 58, 0.5); }
    80%  { box-shadow: 0 0 0 8px rgba(196, 147, 58, 0.5); }
    100% { box-shadow: 0 0 0 0 rgba(196, 147, 58, 0); }
  }
  .hotd-flash {
    animation: hotd-flash 1.5s ease forwards;
    border-radius: 12px;
  }
  ```

- [ ] **Step 2: Verify manually**

  Open the app in the browser. Open DevTools console and run:
  ```js
  document.querySelector('.card')?.classList.add('hotd-flash')
  ```
  Expected: the first card pulses with a gold glow for ~1.5s.

- [ ] **Step 3: Commit**

  ```bash
  git add frontend/src/index.css
  git commit -m "feat: add hotd-flash CSS animation"
  ```

---

### Task 2: Make HOTD card clickable in LibraryPage

**Files:**
- Modify: `frontend/src/pages/LibraryPage.jsx` (lines 174–181)

- [ ] **Step 1: Replace the HOTD card div with a clickable version**

  Find this block in `LibraryPage.jsx` (around line 174):

  ```jsx
  {hotd && highlights.length > 0 && (
    <div style={{ marginBottom: '18px', padding: '14px 16px', background: 'rgba(196,147,58,0.06)', borderLeft: '3px solid #C4933A', borderRadius: '8px' }}>
      <p style={{ margin: '0 0 6px', fontSize: '10px', fontWeight: 700, color: '#C4933A', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Highlight of the Day</p>
      <p style={{ margin: '0 0 8px', fontSize: '14px', lineHeight: 1.65, color: 'var(--text-primary)', direction: getTextDirection(hotd.markedText), textAlign: isHebrew(hotd.markedText) ? 'right' : 'left', fontFamily: isHebrew(hotd.markedText) ? 'serif' : undefined }}>{hotd.markedText}</p>
      <button onClick={() => { const b = books.find(x => x.id === hotd.bookId); if (b) navigate('book-detail', { bookId: b.id }); }} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontSize: '12px', color: 'var(--accent-primary)', fontFamily: 'DM Sans, sans-serif', fontWeight: 500 }}>
        {(() => { const b = books.find(x => x.id === hotd.bookId); return b ? `— ${b.title}` : ''; })()}
      </button>
    </div>
  )}
  ```

  Replace with:

  ```jsx
  {hotd && highlights.length > 0 && (
    <div
      onClick={() => navigate('highlights', { highlightId: hotd.id })}
      style={{ marginBottom: '18px', padding: '14px 16px', background: 'rgba(196,147,58,0.06)', borderLeft: '3px solid #C4933A', borderRadius: '8px', cursor: 'pointer', transition: 'opacity 150ms' }}
      onMouseEnter={e => e.currentTarget.style.opacity = '0.8'}
      onMouseLeave={e => e.currentTarget.style.opacity = '1'}
      role="button"
      aria-label="View highlight of the day in highlights section"
      tabIndex={0}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') navigate('highlights', { highlightId: hotd.id }); }}
    >
      <p style={{ margin: '0 0 6px', fontSize: '10px', fontWeight: 700, color: '#C4933A', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Highlight of the Day</p>
      <p style={{ margin: '0 0 8px', fontSize: '14px', lineHeight: 1.65, color: 'var(--text-primary)', direction: getTextDirection(hotd.markedText), textAlign: isHebrew(hotd.markedText) ? 'right' : 'left', fontFamily: isHebrew(hotd.markedText) ? 'serif' : undefined }}>{hotd.markedText}</p>
      <span style={{ fontSize: '12px', color: 'var(--accent-primary)', fontFamily: 'DM Sans, sans-serif', fontWeight: 500 }}>
        {(() => { const b = books.find(x => x.id === hotd.bookId); return b ? `— ${b.title}` : ''; })()}
      </span>
    </div>
  )}
  ```

  Note: The `— Book Title` button is changed to a `<span>` because the whole card is now the clickable element.

- [ ] **Step 2: Verify manually**

  In the browser, go to the home (Library) page. Confirm:
  - The HOTD card shows a pointer cursor on hover
  - The card dims slightly on hover
  - Tapping/clicking the card does NOT crash (it navigates — but AllHighlightsPage won't flash yet until Task 4 is done)

- [ ] **Step 3: Commit**

  ```bash
  git add frontend/src/pages/LibraryPage.jsx
  git commit -m "feat: make HOTD card navigate to highlights tab"
  ```

---

### Task 3: Thread pageParams into AllHighlightsPage in App.jsx

**Files:**
- Modify: `frontend/src/App.jsx` (line 58)

- [ ] **Step 1: Pass pageParams to AllHighlightsPage**

  Find this line in `App.jsx`:

  ```jsx
  case 'highlights':     return <AllHighlightsPage navigate={navigate} />;
  ```

  Replace with:

  ```jsx
  case 'highlights':     return <AllHighlightsPage navigate={navigate} pageParams={pageParams} />;
  ```

- [ ] **Step 2: Verify manually**

  In the browser, open DevTools React DevTools (or add a temporary `console.log(pageParams)` at the top of `AllHighlightsPage`). Tap the HOTD card. Confirm `pageParams` contains `{ highlightId: "<some-id>" }` when the Highlights page renders.

  Remove the temporary log after verifying.

- [ ] **Step 3: Commit**

  ```bash
  git add frontend/src/App.jsx
  git commit -m "feat: pass pageParams to AllHighlightsPage"
  ```

---

### Task 4: Scroll to and flash the target highlight in AllHighlightsPage

**Files:**
- Modify: `frontend/src/pages/AllHighlightsPage.jsx`

- [ ] **Step 1: Accept pageParams prop and add cardRefs**

  At the top of `AllHighlightsPage`, update the function signature and add a ref:

  Find:
  ```jsx
  export default function AllHighlightsPage({ navigate }) {
  ```

  Replace with:
  ```jsx
  export default function AllHighlightsPage({ navigate, pageParams = {} }) {
  ```

  Then, after the existing `const debRef = useRef(null);` line, add:
  ```jsx
  const cardRefs = useRef({});
  const flashedRef = useRef(null);
  ```

- [ ] **Step 2: Add the scroll + flash effect**

  After the existing `useEffect` blocks (after line ~41 in the original file), add:

  ```jsx
  useEffect(() => {
    const targetId = pageParams.highlightId;
    if (!targetId || flashedRef.current === targetId) return;
    // Wait one frame for cards to render
    const frame = requestAnimationFrame(() => {
      const el = cardRefs.current[targetId];
      if (!el) return;
      flashedRef.current = targetId;
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('hotd-flash');
      setTimeout(() => el.classList.remove('hotd-flash'), 1600);
    });
    return () => cancelAnimationFrame(frame);
  }, [pageParams.highlightId]);
  ```

  `flashedRef` prevents the flash from re-firing if the component re-renders while staying on the highlights tab.

- [ ] **Step 3: Attach refs to each card wrapper**

  Find the card render section (around line 405 in the original):

  ```jsx
  filtered.map(highlight => (
    <HighlightCard
      key={highlight.id}
      highlight={highlight}
      ...
    />
  ))
  ```

  Replace with:

  ```jsx
  filtered.map(highlight => (
    <div key={highlight.id} ref={el => { cardRefs.current[highlight.id] = el; }}>
      <HighlightCard
        highlight={highlight}
        bookTitle={getBookTitle(highlight.bookId)}
        showBookTitle
        onFavoriteToggle={handleFavoriteToggle}
        onDelete={handleDeleteHighlight}
        onEdit={handleEditHighlight}
        onTagAdd={handleTagAdd}
        onTagRemove={handleTagRemove}
        allTags={allTags}
        navigate={navigate}
      />
    </div>
  ))
  ```

- [ ] **Step 4: Verify manually — full flow**

  1. Open the app on the Library page. Confirm a Highlight of the Day card is visible.
  2. Tap the HOTD card.
  3. Expected:
     - App switches to the Highlights tab
     - Page scrolls to the matching highlight card
     - That card pulses with a gold glow for ~1.5s
  4. Navigate back to Library, tap HOTD again.
  5. Expected: same scroll + flash happens again (because `flashedRef` only prevents re-flash within the *same* page mount; navigating away resets it).

- [ ] **Step 5: Commit**

  ```bash
  git add frontend/src/pages/AllHighlightsPage.jsx
  git commit -m "feat: scroll to and flash highlight of the day in highlights tab"
  ```

---

## Self-Review Checklist

- [x] Spec: HOTD card is tappable → covered in Task 2
- [x] Spec: navigate('highlights', { highlightId }) → covered in Task 2
- [x] Spec: pageParams threaded through App.jsx → covered in Task 3
- [x] Spec: scrollIntoView + gold flash → covered in Task 4
- [x] Spec: flash is one-time per mount (won't re-fire on re-render) → flashedRef in Task 4
- [x] Spec: missing highlight ID fails silently → `if (!el) return` in Task 4
- [x] No placeholders
- [x] Type/name consistency: `highlightId` used consistently across Tasks 2, 3, 4

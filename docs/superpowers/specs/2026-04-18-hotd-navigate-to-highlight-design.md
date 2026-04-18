# Highlight of the Day → Navigate to Highlight

**Date:** 2026-04-18  
**Status:** Approved

## Summary

Tapping the "Highlight of the Day" card on the home page navigates to the Highlights tab, scrolls to that highlight card, and briefly flashes it gold so the user knows exactly which one it is.

## Architecture

Uses the existing `navigate(page, params)` routing in `App.jsx`. No new state management or routing library needed.

## Changes

### 1. LibraryPage.jsx
- The HOTD quote `<p>` (and surrounding card area) becomes clickable: `cursor: pointer`, hover opacity dimming.
- `onClick` calls `navigate('highlights', { highlightId: hotd.id })`.
- The existing `— Book Title` button remains unchanged (still navigates to book detail).

### 2. App.jsx
- Thread `pageParams` into `AllHighlightsPage`:
  ```jsx
  case 'highlights': return <AllHighlightsPage navigate={navigate} pageParams={pageParams} />;
  ```
- No other changes needed; `pageParams` is already in state.

### 3. AllHighlightsPage.jsx
- Accept `pageParams` prop (default `{}`).
- Build a card refs map: `const cardRefs = useRef({})`. Each rendered `HighlightCard` wrapper gets `ref={el => cardRefs.current[highlight.id] = el}`.
- `useEffect` keyed on `pageParams.highlightId`:
  - If a target ID exists, call `cardRefs.current[id]?.scrollIntoView({ behavior: 'smooth', block: 'center' })`.
  - Add a CSS class `hotd-flash` to the wrapper element, remove it after 1600ms.

### 4. CSS (index.css or App.css)
```css
@keyframes hotd-flash {
  0%   { box-shadow: 0 0 0 0 rgba(196, 147, 58, 0); }
  20%  { box-shadow: 0 0 0 6px rgba(196, 147, 58, 0.45); }
  80%  { box-shadow: 0 0 0 6px rgba(196, 147, 58, 0.45); }
  100% { box-shadow: 0 0 0 0 rgba(196, 147, 58, 0); }
}
.hotd-flash {
  animation: hotd-flash 1.5s ease forwards;
  border-radius: 12px;
}
```

## Data Flow

```
User taps HOTD card
  → navigate('highlights', { highlightId: hotd.id })
  → App sets currentPage='highlights', pageParams={ highlightId }
  → AllHighlightsPage renders with pageParams.highlightId
  → useEffect fires → scrollIntoView + adds .hotd-flash class
  → 1.5s later: glow fades, class removed
```

## Edge Cases

- If `highlightId` in `pageParams` doesn't match any rendered card (e.g. deleted highlight), the scroll/flash silently does nothing.
- If filters are active when navigating back to highlights, the target card may be hidden. Since no filters are applied on navigation (by design — all highlights remain visible), this is not an issue on first arrival. Subsequent filter changes are the user's own action.
- `pageParams` persists while on the highlights tab; re-renders won't re-trigger the flash because the `useEffect` dependency only fires once per unique `highlightId` value arrival.

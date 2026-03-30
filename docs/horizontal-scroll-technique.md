# Mobile Horizontal Scrolling Sections — Technical Approach

This documents the pure-CSS horizontal scrolling technique used on the Eggo home page for mobile card carousels, with an automatic switch to a grid layout on desktop.

## Architecture Overview

The home page uses a `SetCarousel` component that renders multiple themed sections of cards. On mobile, each section scrolls horizontally; on desktop (768px+), it converts to a CSS grid. The entire scrolling behavior is **pure CSS** — no JavaScript scroll handling.

## Component Structure

```
CollectionHome
  └── SetCarousel (one per section)
        └── .carousel (overflow container)
              └── .track (flex row, scrollable)
                    └── .item (fixed-width card wrapper)
                          └── SetCard (compact)
```

The `SetCarousel` component accepts a `title`, `sets` array, optional `viewAllHref`, and an optional `maxItems` to cap how many cards render. Each card is wrapped in a `.item` div with a fixed width.

## Core CSS Technique

The scrolling is implemented using three main CSS features working together.

### 1. Flexbox + Overflow

```css
.track {
  display: flex;
  align-items: stretch;
  gap: var(--layout-card-gap);        /* 0.75rem */
  overflow-x: auto;
}

.item {
  flex-shrink: 0;                     /* Prevents cards from compressing */
  width: var(--layout-carousel-card-width);  /* 160px */
}
```

The track is a flex row that overflows horizontally. Each item has `flex-shrink: 0` so it maintains its fixed width (`160px`) rather than collapsing to fit the viewport.

### 2. CSS Scroll Snap

```css
.track {
  scroll-snap-type: x mandatory;
  scroll-padding-left: var(--layout-content-padding);
}

.item {
  scroll-snap-align: start;
}
```

- `scroll-snap-type: x mandatory` forces the scroll position to snap to a card boundary after the user lifts their finger.
- `scroll-snap-align: start` means each card snaps its left edge to the container's left edge.
- `scroll-padding-left` ensures the snap point respects the horizontal padding, so the first visible card aligns with the section title.

### 3. Hidden Scrollbars

```css
.track {
  scrollbar-width: none;             /* Firefox */
  -ms-overflow-style: none;          /* IE/Edge */
  -webkit-overflow-scrolling: touch; /* iOS momentum scrolling */
}

.track::-webkit-scrollbar {
  display: none;                     /* Chrome, Safari */
}
```

Scrollbars are hidden across all browsers. The `-webkit-overflow-scrolling: touch` property enables iOS momentum/inertia scrolling so the scroll feels native.

### 4. Edge Padding Trick

```css
.carousel {
  position: relative;
  overflow: hidden;
}

.track {
  padding: var(--space-1) var(--layout-content-padding);
  margin: calc(-1 * var(--space-1)) 0;
}
```

Padding is applied to the track (not the outer container) so cards bleed to the screen edge when scrolled, but the resting position has proper inset. The negative margin compensates for the vertical padding so card shadows aren't clipped by the `overflow: hidden` on `.carousel`.

## Responsive Breakpoint

At 768px+, the track switches from horizontal scroll to a grid:

```css
@media (min-width: 768px) {
  .track {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(var(--layout-card-min-width), 1fr));
    overflow-x: visible;
    scroll-snap-type: none;
  }

  .item {
    width: auto;
  }
}
```

The same markup serves both layouts — only CSS changes.

## Design Tokens

| Token | Value | Purpose |
|-------|-------|---------|
| `--layout-carousel-card-width` | `160px` | Fixed card width on mobile |
| `--layout-card-min-width` | `180px` | Min width for desktop grid columns |
| `--layout-card-gap` | `0.75rem` | Gap between cards |
| `--layout-content-padding` | `1rem` (desktop) / `0.5rem` (mobile) | Horizontal page padding |

## Global Scrolling Behavior

Two global CSS rules support the experience:

- `scroll-behavior: smooth` on `html` (respects `prefers-reduced-motion`)
- `overscroll-behavior: none` on `body` to prevent pull-to-refresh and scroll chaining on iOS

## Key Takeaways for Reimplementation

1. **No JS needed** — the entire scrolling UX is CSS-only (Scroll Snap + flexbox overflow).
2. **Fixed-width cards** with `flex-shrink: 0` are essential to prevent layout collapse.
3. **`scroll-snap-type: x mandatory`** + **`scroll-snap-align: start`** gives the "page-by-card" feel.
4. **`scroll-padding-left`** must match your content padding so snap positions align with your header text.
5. **Negative margin trick** prevents `overflow: hidden` from clipping box shadows.
6. **Hide scrollbars** on all three browser families (webkit pseudo-element, Firefox property, IE property).
7. **Same markup, responsive CSS** — switch from `display: flex` to `display: grid` at your breakpoint.

# SetCarousel

## Metadata
- **Category**: data-display
- **Status**: stable
- **CSS**: SetCarousel.module.css

## Overview
**When to use**: To display a horizontal scrolling section of set cards on the collection home page. Each section has a title and optional "View All" link.
**When not to use**: For the full set list view (use SetList). For non-set content.

## Anatomy
1. **Section** (`.section`) -- vertical flex container
2. **Header** (`.header`) -- title + "View All" link row
3. **Title** (`.title`) -- section heading
4. **View All** (`.viewAll`) -- link with arrow icon
5. **Carousel** (`.carousel`) -- overflow container
6. **Track** (`.track`) -- horizontal scroll strip / grid
7. **Item** (`.item`) -- fixed-width card slot
8. **Empty** (`.empty`) -- centered empty state message

## Tokens Used
| Token | Property | Value |
|-------|----------|-------|
| --space-3 | section gap | 12px |
| --space-1 | track padding, view all gap, header padding (desktop=0) | 4px |
| --layout-content-padding | header/track/empty horizontal padding | var(--space-4) |
| --layout-card-gap | track gap | var(--space-3) = 12px |
| --layout-carousel-card-width | item width (mobile) | 160px |
| --layout-card-min-width | grid column min (desktop) | 180px |
| --font-size-lg | title font size | 16px |
| --font-weight-semibold | title weight | 600 |
| --text-primary | title color | (themed) |
| --font-size-sm | view all, empty message font | 13px |
| --font-weight-medium | view all weight | 500 |
| --text-link | view all color | (themed) |
| --text-link-hover | view all hover | (themed) |
| --text-tertiary | empty text | (themed) |
| --surface-secondary | empty bg | (themed) |
| --radius-lg | empty radius | 12px |
| --space-8 | empty vertical padding | 32px |
| --transition-fast | view all/arrow transitions | 150ms ease-out |

## Props / API
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| title | `string` | -- | Section heading text |
| sets | `LegoSet[]` | -- | Sets to display |
| viewAllHref | `string` | -- | Link for "View All" (shown when sets > 0) |
| emptyMessage | `string` | `'No sets to display'` | Empty state text |
| maxItems | `number` | -- | Limit displayed cards |
| getDetail | `(set) => string \| undefined` | -- | Extract detail text for compact cards |
| linkPrefix | `string` | -- | URL prefix for public share links |
| hideStatus | `boolean` | -- | Hide status badges on cards |

## Responsive Behavior
- **Mobile (< 768px)**: Horizontal scroll, snap-to-start, 160px fixed-width cards, hidden scrollbar, iOS momentum scrolling
- **Desktop (>= 768px)**: CSS grid with auto-fill columns (180px min), no horizontal scroll, header padding removed

## States
- **Default**: horizontal carousel or grid of compact SetCards
- **Empty**: centered message in tinted background
- **Hover** (View All): color shifts, arrow translates 2px right

## Code Example
```tsx
<SetCarousel
  title="Recently Added"
  sets={recentSets}
  viewAllHref="/sets?sort=dateReceived"
  maxItems={10}
/>
```

## Cross-references
- Related: [SetCard](./set-card.md), [CollectionHome](./collection-home.md)

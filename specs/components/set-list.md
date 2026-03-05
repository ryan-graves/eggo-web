# SetList

## Metadata
- **Category**: data-display
- **Status**: stable
- **CSS**: SetList.module.css

## Overview
**When to use**: As the primary "all sets" view for a collection. Combines search, filtering, sorting, and a responsive card grid.
**When not to use**: For curated carousels or home page sections (use SetCarousel). For skeleton loading (use SetCardSkeleton in a grid).

## Anatomy
1. **Container** (`.container`) -- vertical flex column, 16px gap
2. **Mobile Filters** (`.mobileFilters`) -- search input + filter sheet trigger (< 640px)
3. **Mobile Filter Tags** (`.mobileFilterTags`) -- active filter pills (< 640px)
4. **Desktop Filters** (`.desktopFilters`) -- search + inline selects + sort group (>= 640px)
5. **Stats** (`.stats`) -- set count and total pieces
6. **Grid** (`.grid`) -- responsive CSS grid of SetCards
7. **Empty** (`.empty`) -- centered empty state message

## Tokens Used
| Token | Property | Value |
|-------|----------|-------|
| --space-4 | container gap | 16px |
| --space-3 | filter bar gap, sort group desktop padding | 12px |
| --space-2 | input padding, sort group gap | 8px |
| --layout-content-padding | mobile filter/grid padding | var(--space-4) = 16px |
| --surface-primary | filter bar bg, input bg, select bg | (themed) |
| --border-primary | filter bar border | (themed) |
| --border-secondary | input/select border, sort group divider | (themed) |
| --border-focus | input/select focus | (themed) |
| --radius-lg | filter bar radius | 12px |
| --radius-md | input/select/button radius | 8px |
| --font-size-sm | input, stats, sort button font | 13px |
| --font-size-xs | sort label, filter badge font | 11px |
| --text-primary | input text, select text | (themed) |
| --text-secondary | stats, sort button color | (themed) |
| --text-tertiary | placeholder, total pieces, sort label | (themed) |
| --min-width-search | search input min-width | 200px |
| --min-width-select | select min-width | 140px |
| --interactive-primary | filter badge bg | (themed) |
| --text-inverse | filter badge text | (themed) |
| --size-badge-min | filter badge min size | 18px |
| --radius-full | filter badge radius | 9999px |
| --layout-card-gap | grid gap | var(--space-3) = 12px |
| --layout-card-min-width | grid column min (desktop) | 180px |
| --layout-card-min-width-mobile | grid column min (mobile) | 140px |
| --space-12 | empty state padding | 48px |
| --letter-spacing-wide | sort label tracking | 0.025em |

## Props / API
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| sets | `LegoSet[]` | -- | Full set array (pre-filter) |
| availableOwners | `string[]` | -- | Owner options for filter dropdowns |
| linkPrefix | `string` | -- | URL prefix for public share links |
| viewSettings | `PublicViewSettings` | -- | Controls visibility of owner/status in public view |
| emptyMessage | `string` | `'No sets in your collection yet...'` | Message when collection is empty |

## Responsive Behavior
- **Mobile (< 640px)**: Shows mobile filter bar (search + filter button) and mobile filter tags. Desktop filters hidden. Grid uses 140px min column.
- **Desktop (>= 640px)**: Shows inline desktop filters with search, status, owner, theme selects, and sort group. Mobile filters hidden. Grid uses 180px min column.
- **Wide (>= 1024px)**: Sort group pushed right with left border divider.

## States
- **Default**: grid of cards with stats
- **Filtered**: stats update, filter tags appear (mobile), selects highlight
- **Empty collection**: centered message with `emptyMessage`
- **No filter matches**: "No sets match your filters." message

## Code Example
```tsx
<SetList
  sets={allSets}
  availableOwners={['Ryan', 'Alyssa']}
  emptyMessage="Add your first set!"
/>
```

## Cross-references
- Related: [SetCard](./set-card.md), [FilterSheet](./filter-sheet.md), [FilterTags](./filter-tags.md)

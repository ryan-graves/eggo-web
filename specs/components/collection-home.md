# CollectionHome

## Metadata
- **Category**: layout
- **Status**: stable
- **CSS**: CollectionHome.module.css

## Overview
**When to use**: As the main landing view for a collection, rendering configurable sections (carousels) of sets. Supports customization via HomeSectionsSheet.
**When not to use**: For the full "all sets" view (use SetList).

## Anatomy
1. **Container** (`.container`) -- vertical flex column of sections
2. **Customize Row** (`.customizeRow`) -- right-aligned button row
3. **Customize Button** (`.customizeButton`) -- opens HomeSectionsSheet
4. **Sections** -- array of SetCarousel components
5. **Empty** (`.empty`) -- empty collection state
6. **Empty Sections** (`.emptySections`) -- no sections have matching sets
7. **Customize Link Button** (`.customizeLinkButton`) -- inline text link to open customization

## Tokens Used
| Token | Property | Value |
|-------|----------|-------|
| --space-6 | section gap (mobile) | 24px |
| --space-8 | section gap (desktop), bottom padding | 32px |
| --layout-content-padding | customize row mobile padding | var(--space-4) |
| --border-secondary | customize button border | (themed) |
| --button-radius | customize button radius | var(--radius-md) = 8px |
| --font-size-xs | customize button font | 11px |
| --font-weight-medium | customize button weight | 500 |
| --text-secondary | customize button, empty text color | (themed) |
| --text-primary | customize hover text, empty first-p | (themed) |
| --surface-secondary | customize hover bg, empty sections bg | (themed) |
| --border-primary | customize hover border | (themed) |
| --interactive-primary | link button color | (themed) |
| --font-size-lg | empty heading font | 16px |
| --font-size-sm | empty sections, link button font | 13px |
| --space-16 | empty collection padding | 64px |
| --space-12 | empty sections padding | 48px |
| --space-4 | empty horizontal padding | 16px |
| --space-2 | empty gap | 8px |
| --space-3 | empty sections gap | 12px |
| --outline-offset | link button underline offset | 2px |
| --transition-fast | hover transitions | 150ms ease-out |

## Props / API
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| sets | `LegoSet[]` | -- | All sets in the collection |
| readOnly | `boolean` | `false` | Hides customize UI, uses default sections (for public view) |
| linkPrefix | `string` | -- | URL prefix for public share links |
| hideStatus | `boolean` | -- | Hide status badges on all cards |

## Behavior
- Reads user's home section preferences via `useHomeSections()` hook
- Falls back to `DEFAULT_HOME_SECTIONS` when readOnly or no saved preference
- Sections with zero matching sets are filtered out
- Customize button opens HomeSectionsSheet

## States
- **Default**: vertical stack of SetCarousel sections
- **Empty collection**: centered message with optional "add sets" prompt
- **No matching sections**: prompt to customize sections
- **Read-only**: no customize UI

## Code Example
```tsx
<CollectionHome sets={allSets} />
<CollectionHome sets={allSets} readOnly linkPrefix="/share/abc/set" hideStatus />
```

## Cross-references
- Related: [SetCarousel](./set-carousel.md), [HomeSectionsSheet](./home-sections-sheet.md), [SetList](./set-list.md)

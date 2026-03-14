# SetCard

## Metadata
- **Category**: data-display
- **Status**: stable
- **CSS**: SetCard.module.css

## Overview
**When to use**: To display a Lego set in a grid or carousel. The primary interactive surface for browsing collections.
**When not to use**: For non-set data. For skeleton loading states (use SetCardSkeleton).

## Anatomy
1. **Card** (`.card`) -- link wrapper, full-height flex column
2. **Image Container** (`.imageContainer`) -- 1:1 aspect ratio region
3. **Image Inner** (`.imageInner`) -- inset container for the image
4. **Image Dot** (`.imageDot`) -- red indicator when custom image is missing
5. **Content** (`.content`) -- text region below image
6. **Name** (`.name`) -- set name, 2-line clamp
7. **Set Number** (`.setNumber`) -- "#12345-1" subtitle
8. **Meta** (`.meta`) -- status badge + owner tag row (full mode)
9. **Details** (`.details`) -- piece count + theme (full mode)
10. **Compact Footer** (`.compactFooter`) -- detail text + status (compact mode)

## Tokens Used
| Token | Property | Value |
|-------|----------|-------|
| --surface-primary | card background | (themed) |
| --border-primary | card border | (themed) |
| --border-secondary | hover border, owner tag border | (themed) |
| --radius-md | card border radius | 8px |
| --shadow-card | hover shadow | (themed) |
| --border-width-medium | focus outline width | 2px |
| --border-focus | focus outline color | (themed) |
| --outline-offset | focus outline offset | 2px |
| --transition-fast | border/shadow transitions | 150ms ease-out |
| --opacity-active | active press | 0.7 |
| --opacity-disabled | loading state | 0.5 |
| --space-3 | image inset, content side padding | 12px |
| --space-2 | content top padding, meta padding-top | 8px |
| --space-1 | content gap, meta gap | 4px |
| --font-size-sm | name font size | 13px |
| --font-weight-bold | name weight | 700 |
| --line-height-tight | name line height | 1.2 |
| --letter-spacing-tight | name tracking | -0.01em |
| --font-size-xs | set number, details font size | 11px |
| --font-size-2xs | owner tag font size | 10px |
| --text-primary | name color | (themed) |
| --text-tertiary | set number, placeholder, details color | (themed) |
| --text-secondary | owner tag, detail text color | (themed) |
| --status-error | image dot color | (themed) |
| --size-dot | image dot dimensions | 8px |
| --radius-full | image dot radius | 9999px |
| --radius-sm | owner tag radius | 6px |
| --z-above | image dot z-index | 1 |

## Props / API
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| set | `LegoSet` | -- | The set data to display |
| compact | `boolean` | `false` | Compact mode for carousels (hides meta row, shows detail text) |
| detail | `string` | -- | Detail text shown in compact mode |
| linkPrefix | `string` | -- | URL prefix override (e.g., for public share links) |
| hideOwner | `boolean` | `false` | Hide owner badge |
| hideStatus | `boolean` | `false` | Hide status badge |

## States
- **Default**: --border-primary border, no shadow
- **Hover** (hover-capable devices): --border-secondary border, --shadow-card
- **Active**: opacity 0.7
- **Focus-visible**: 2px --border-focus outline with 2px offset
- **Loading** (navigation pending): opacity 0.5, pointer-events disabled

## Code Example
```tsx
<SetCard set={legoSet} />
<SetCard set={legoSet} compact detail="1,234 pieces" />
<SetCard set={legoSet} linkPrefix="/share/abc123/set" hideOwner />
```

## Cross-references
- Related: [StatusBadge](./status-badge.md), [SetCardSkeleton](./set-card-skeleton.md), [SetCarousel](./set-carousel.md), [SetList](./set-list.md)

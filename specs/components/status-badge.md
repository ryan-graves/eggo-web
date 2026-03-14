# Status Badge

## Metadata
- **Category**: data-display
- **Status**: stable
- **CSS**: styles/status.css (global utility classes)

## Overview
**When to use**: To display the current status of a Lego set on cards, detail pages, and list items.
**When not to use**: For general-purpose tags or labels unrelated to set status.

## Anatomy
1. **Badge** -- single inline element with colored background and text

## Tokens Used
| Token | Property | Value |
|-------|----------|-------|
| --font-size-xs | default badge font size | 11px |
| --font-size-2xs | small badge font size | 10px |
| --font-weight-medium | font weight | 500 |
| --space-1, --space-2 | default padding | 4px 8px |
| --space-0-5, --space-1 | small padding | 2px 4px |
| --radius-sm | border radius | 6px |
| --status-unopened-bg | unopened bg | (themed) |
| --status-unopened | unopened text | (themed) |
| --status-info-bg | in_progress / rebuild bg | (themed) |
| --status-info | in_progress / rebuild text | (themed) |
| --status-success-bg | assembled bg | (themed) |
| --status-success | assembled text | (themed) |
| --status-warning-bg | disassembled bg | (themed) |
| --status-warning | disassembled text | (themed) |

## Sizes

| Size | Class | Font Size | Padding |
|------|-------|-----------|---------|
| Default | `.status-badge` | 11px | 4px 8px |
| Small | `.status-badge-sm` | 10px | 2px 4px |

## Status Variants

| Status | Class | Background | Text |
|--------|-------|-----------|------|
| Unopened | `.status-unopened` | --status-unopened-bg | --status-unopened |
| In Progress | `.status-in_progress` | --status-info-bg | --status-info |
| Rebuild In Progress | `.status-rebuild_in_progress` | --status-info-bg | --status-info |
| Assembled | `.status-assembled` | --status-success-bg | --status-success |
| Disassembled | `.status-disassembled` | --status-warning-bg | --status-warning |

## Dark Mode
- All status variants (including unopened) handled by themed semantic variables in theme.css

## States
- **Default**: static display only, no interactive states

## Code Example
```tsx
<span className="status-badge status-assembled">Assembled</span>
<span className="status-badge-sm status-unopened">Unopened</span>
```

## Cross-references
- Related: [SetCard](./set-card.md), [SetCardSkeleton](./set-card-skeleton.md)

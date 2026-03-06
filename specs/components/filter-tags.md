# FilterTags

## Metadata
- **Category**: data-display
- **Status**: stable
- **CSS**: FilterTags.module.css

## Overview
**When to use**: To display active filter selections as removable pills. Shown below the mobile filter bar when filters are active.
**When not to use**: For static category labels or non-removable tags.

## Anatomy
1. **Container** (`.container`) -- flex-wrap row with 8px gap
2. **Tag** (`.tag`) -- pill with label, value, and remove button
3. **Tag Label** (`.tagLabel`) -- dimmed category name (e.g., "Status:")
4. **Tag Value** (`.tagValue`) -- truncated filter value
5. **Remove Button** (`.removeButton`) -- circular dismiss button

## Tokens Used
| Token | Property | Value |
|-------|----------|-------|
| --space-2 | container gap, tag left padding | 8px |
| --space-1 | tag internal gap, tag right padding, remove margin | 4px |
| --interactive-primary | tag background | (themed) |
| --text-inverse | tag text and remove button color | (themed) |
| --radius-full | tag and remove button radius | 9999px |
| --font-size-xs | tag font size | 11px |
| --font-weight-medium | tag weight | 500 |
| --opacity-hover | label opacity | 0.8 |
| --max-width-tag | value max width | 120px |
| --size-icon-sm | remove button dimensions | 18px |
| --font-size-sm | remove button font size | 13px |
| --overlay-light-20 | remove button default bg | rgb(255 255 255 / 0.2) |
| --overlay-light-30 | remove button hover bg | rgb(255 255 255 / 0.3) |
| --overlay-light-40 | remove button active bg | rgb(255 255 255 / 0.4) |
| --duration-fast | fade-in animation | 150ms |
| --transition-fast | remove button transition | 150ms ease-out |

## Props / API
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| tags | `FilterTag[]` | -- | Array of `{ key, label, value, onRemove }` objects |

Returns `null` when `tags` is empty.

## States
- **Default**: accent-colored pill with fade-in scale animation
- **Hover** (remove button): lighter overlay background
- **Active** (remove button): even lighter overlay background

## Code Example
```tsx
<FilterTags
  tags={[
    { key: 'status', label: 'Status', value: 'Assembled', onRemove: handleRemove },
  ]}
/>
```

## Cross-references
- Related: [SetList](./set-list.md), [FilterSheet](./filter-sheet.md)

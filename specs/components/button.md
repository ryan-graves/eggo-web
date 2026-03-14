# Button

## Metadata
- **Category**: input
- **Status**: stable
- **CSS**: styles/button.css (global utility classes)

## Overview
**When to use**: For all interactive actions throughout the app. Provides consistent sizing, spacing, and color variants.
**When not to use**: For navigation links that look like plain text. For icon-only actions that need custom sizing outside the standard 40px/32px grid.

## Anatomy
1. **Container** -- inline-flex element with centered content
2. **Icon** (optional) -- leading or standalone icon
3. **Label** (optional) -- text label

## Tokens Used
| Token | Property | Value |
|-------|----------|-------|
| --button-gap | gap between icon and label | var(--space-2) = 8px |
| --button-radius | border-radius | var(--radius-md) = 8px |
| --button-height-default | icon-only default height | var(--size-button-icon) = 40px |
| --button-height-small | icon-only small height | var(--size-button-icon-sm) = 32px |
| --button-padding-default | horizontal padding (default) | var(--space-4) = 16px |
| --button-padding-small | horizontal padding (small) | var(--space-3) = 12px |
| --button-font-size-default | font size (default) | var(--font-size-sm) = 13px |
| --button-font-size-small | font size (small) | var(--font-size-xs) = 11px |
| --font-weight-medium | font weight | 500 |
| --transition-fast | all transitions | 150ms ease-out |
| --opacity-muted | disabled opacity | 0.6 |
| --opacity-active | active press opacity | 0.7 |

## Sizes

| Size | Class | Vertical Padding | Horizontal Padding | Font Size | Icon-only Dimensions |
|------|-------|------------------|--------------------|-----------|---------------------|
| Default | `.btn-default` | var(--space-2) = 8px | var(--space-4) = 16px | 13px | 40x40px |
| Small | `.btn-small` | var(--space-2) = 8px | var(--space-3) = 12px | 11px | 32x32px |

## Variants

| Variant | Class | Background | Text Color | Border | Hover |
|---------|-------|-----------|------------|--------|-------|
| Primary | `.btn-primary` | --interactive-primary | --text-inverse | none | --interactive-primary-hover |
| Secondary | `.btn-secondary` | --surface-primary | --text-primary | 1px --border-secondary | --surface-secondary bg |
| Ghost | `.btn-ghost` | transparent | --text-primary | none | --surface-secondary bg |
| Danger | `.btn-danger` | --status-error-bg | --status-error | none | --status-error bg, --text-inverse text |

## Modifiers
| Modifier | Class | Effect |
|----------|-------|--------|
| Icon-only | `.btn-icon` | Fixed square dimensions, padding removed |

## States
- **Default**: Variant-specific background and text color
- **Hover**: Variant-specific hover background (`:hover:not(:disabled)`)
- **Active**: `opacity: var(--opacity-active)` = 0.7 (`:active:not(:disabled)`)
- **Disabled**: `opacity: var(--opacity-muted)` = 0.6, `cursor: not-allowed`

## Code Example
```tsx
<button className="btn-default btn-primary">Submit</button>
<button className="btn-small btn-secondary">Cancel</button>
<button className="btn-default btn-ghost btn-icon">
  <Icon />
</button>
<button className="btn-default btn-danger">Delete</button>
```

## Cross-references
- Related: [Form](./form.md), [Modal](./modal.md)

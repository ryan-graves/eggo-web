# Token Reference

## How to Use

Components (Layer 3) reference Layer 2 semantic aliases. Never reference Layer 1 primitives directly in component CSS.

- **Layer 1** — Primitive tokens: raw design values defined in `tokens.css`. Named by scale (e.g., `--color-gray-500`, `--space-4`).
- **Layer 2** — Semantic aliases: project-level references to Layer 1. Non-themed aliases live in `tokens.css`; themed aliases live in `theme.css`. Named by purpose (e.g., `--text-secondary`, `--surface-primary`).
- **Layer 3** — Components consume only Layer 2 aliases.

---

## Color Primitives (Layer 1)

### Neutrals

| Token | Value | Notes |
|-------|-------|-------|
| `--color-white` | `#ffffff` | Pure white |
| `--color-black` | `#000000` | Pure black |
| `--color-gray-50` | `#fafafa` | Lightest gray |
| `--color-gray-100` | `#f4f4f5` | |
| `--color-gray-200` | `#e4e4e7` | |
| `--color-gray-300` | `#d4d4d8` | |
| `--color-gray-400` | `#a1a1aa` | |
| `--color-gray-500` | `#71717a` | Mid gray |
| `--color-gray-600` | `#52525b` | |
| `--color-gray-700` | `#3f3f46` | |
| `--color-gray-800` | `#27272a` | |
| `--color-gray-850` | `#1f1f23` | Non-standard step |
| `--color-gray-900` | `#18181b` | |
| `--color-gray-950` | `#09090b` | Darkest gray |

### Accent — Orange

| Token | Value |
|-------|-------|
| `--color-orange-400` | `#fb923c` |
| `--color-orange-500` | `#f97316` |
| `--color-orange-600` | `#ea580c` |

### Brand Palette

| Token | Value |
|-------|-------|
| `--color-red-500` | `#ef4444` |
| `--color-red-600` | `#dc2626` |
| `--color-yellow-400` | `#facc15` |
| `--color-yellow-500` | `#eab308` |
| `--color-blue-500` | `#3b82f6` |
| `--color-blue-600` | `#2563eb` |
| `--color-green-500` | `#22c55e` |
| `--color-green-600` | `#16a34a` |

### Status

| Token | Value |
|-------|-------|
| `--color-success` | `#22c55e` |
| `--color-warning` | `#f59e0b` |
| `--color-error` | `#ef4444` |
| `--color-info` | `#3b82f6` |

---

## Spacing (Layer 1)

| Token | Value | px Equivalent |
|-------|-------|---------------|
| `--space-0` | `0` | 0px |
| `--space-0-5` | `0.125rem` | 2px |
| `--space-1` | `0.25rem` | 4px |
| `--space-2` | `0.5rem` | 8px |
| `--space-3` | `0.75rem` | 12px |
| `--space-4` | `1rem` | 16px |
| `--space-5` | `1.25rem` | 20px |
| `--space-6` | `1.5rem` | 24px |
| `--space-8` | `2rem` | 32px |
| `--space-10` | `2.5rem` | 40px |
| `--space-12` | `3rem` | 48px |
| `--space-16` | `4rem` | 64px |
| `--space-20` | `5rem` | 80px |

---

## Typography (Layer 1)

### Font Sizes

| Token | Value | px Equivalent |
|-------|-------|---------------|
| `--font-size-2xs` | `0.625rem` | 10px |
| `--font-size-xs` | `0.6875rem` | 11px |
| `--font-size-sm` | `0.8125rem` | 13px |
| `--font-size-base` | `0.875rem` | 14px |
| `--font-size-lg` | `1rem` | 16px |
| `--font-size-xl` | `1.125rem` | 18px |
| `--font-size-2xl` | `1.375rem` | 22px |
| `--font-size-3xl` | `1.75rem` | 28px |
| `--font-size-4xl` | `2.25rem` | 36px |

### Font Weights

| Token | Value |
|-------|-------|
| `--font-weight-normal` | `400` |
| `--font-weight-medium` | `500` |
| `--font-weight-semibold` | `600` |
| `--font-weight-bold` | `700` |

### Line Heights

| Token | Value |
|-------|-------|
| `--line-height-none` | `1` |
| `--line-height-tight` | `1.2` |
| `--line-height-snug` | `1.35` |
| `--line-height-normal` | `1.5` |
| `--line-height-relaxed` | `1.65` |

### Letter Spacing

| Token | Value |
|-------|-------|
| `--letter-spacing-tighter` | `-0.02em` |
| `--letter-spacing-tight` | `-0.01em` |
| `--letter-spacing-normal` | `0` |
| `--letter-spacing-wide` | `0.025em` |
| `--letter-spacing-wider` | `0.05em` |

---

## Border Radius (Layer 1)

| Token | Value | px Equivalent |
|-------|-------|---------------|
| `--radius-sm` | `0.375rem` | 6px |
| `--radius-md` | `0.5rem` | 8px |
| `--radius-lg` | `0.75rem` | 12px |
| `--radius-xl` | `1rem` | 16px |
| `--radius-2xl` | `1.25rem` | 20px |
| `--radius-full` | `9999px` | Pill/circle |

---

## Shadows (Layer 1)

| Token | Value |
|-------|-------|
| `--shadow-sm` | `0 1px 2px 0 rgb(0 0 0 / 0.05)` |
| `--shadow-md` | `0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)` |
| `--shadow-lg` | `0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)` |

---

## Motion (Layer 1)

### Durations

| Token | Value |
|-------|-------|
| `--duration-fast` | `150ms` |
| `--duration-normal` | `200ms` |
| `--duration-slow` | `300ms` |
| `--duration-slower` | `500ms` |
| `--duration-spin` | `800ms` |
| `--duration-shimmer` | `1.5s` |
| `--duration-progress` | `2s` |

### Transitions

| Token | Value |
|-------|-------|
| `--transition-fast` | `150ms ease-out` |
| `--transition-normal` | `200ms ease-in-out` |
| `--transition-slow` | `300ms ease-in-out` |
| `--transition-slower` | `500ms ease-in-out` |
| `--transition-progress` | `500ms ease-out` |

### Easing

| Token | Value |
|-------|-------|
| `--ease-out` | `cubic-bezier(0, 0, 0.2, 1)` |
| `--ease-in-out` | `cubic-bezier(0.4, 0, 0.2, 1)` |
| `--ease-vaul` | `cubic-bezier(0.32, 0.72, 0, 1)` |

---

## Semantic: Surfaces (Layer 2, themed)

| Token | Dark | Light | Usage |
|-------|------|-------|-------|
| `--surface-background` | `--color-gray-950` (#09090b) | `--color-gray-50` (#fafafa) | Page background |
| `--surface-primary` | `--color-gray-900` (#18181b) | `--color-white` (#ffffff) | Card backgrounds |
| `--surface-secondary` | `--color-gray-850` (#1f1f23) | `--color-gray-100` (#f4f4f5) | Nested surfaces |
| `--surface-tertiary` | `--color-gray-800` (#27272a) | `--color-gray-200` (#e4e4e7) | Tertiary surfaces |
| `--surface-inverse` | `--color-gray-100` (#f4f4f5) | `--color-gray-900` (#18181b) | Inverted surfaces |

---

## Semantic: Text (Layer 2, themed)

| Token | Dark | Light | Usage |
|-------|------|-------|-------|
| `--text-primary` | `--color-gray-100` (#f4f4f5) | `--color-gray-900` (#18181b) | Primary body text |
| `--text-secondary` | `--color-gray-400` (#a1a1aa) | `--color-gray-600` (#52525b) | Supporting text |
| `--text-tertiary` | `--color-gray-500` (#71717a) | `--color-gray-500` (#71717a) | Placeholder text |
| `--text-inverse` | `--color-gray-900` (#18181b) | `--color-white` (#ffffff) | Text on inverse surfaces |
| `--text-link` | `--color-orange-500` (#f97316) | `--color-orange-600` (#ea580c) | Link text |
| `--text-link-hover` | `--color-orange-400` (#fb923c) | `--color-orange-500` (#f97316) | Link hover |

---

## Semantic: Borders (Layer 2, themed)

| Token | Dark | Light | Usage |
|-------|------|-------|-------|
| `--border-primary` | `--color-gray-800` (#27272a) | `--color-gray-200` (#e4e4e7) | Default borders |
| `--border-secondary` | `--color-gray-700` (#3f3f46) | `--color-gray-300` (#d4d4d8) | Stronger borders |
| `--border-focus` | `--color-orange-500` (#f97316) | `--color-orange-500` (#f97316) | Focus ring color |

---

## Semantic: Interactive (Layer 2, themed)

| Token | Dark | Light | Usage |
|-------|------|-------|-------|
| `--interactive-primary` | `--color-orange-500` (#f97316) | `--color-orange-500` (#f97316) | Primary buttons |
| `--interactive-primary-hover` | `--color-orange-400` (#fb923c) | `--color-orange-600` (#ea580c) | Primary hover |
| `--interactive-primary-bg` | `rgba(249, 115, 22, 0.1)` | `rgba(249, 115, 22, 0.1)` | Subtle primary background |
| `--interactive-secondary` | `--color-gray-800` (#27272a) | `--color-gray-200` (#e4e4e7) | Secondary buttons |
| `--interactive-secondary-hover` | `--color-gray-700` (#3f3f46) | `--color-gray-300` (#d4d4d8) | Secondary hover |

---

## Semantic: Status (Layer 2, themed)

| Token | Dark | Light | Usage |
|-------|------|-------|-------|
| `--status-success` | `--color-success` (#22c55e) | `--color-success` (#22c55e) | Success text/icons |
| `--status-warning` | `--color-warning` (#f59e0b) | `--color-warning` (#f59e0b) | Warning text/icons |
| `--status-error` | `--color-error` (#ef4444) | `--color-error` (#ef4444) | Error text/icons |
| `--status-info` | `--color-info` (#3b82f6) | `--color-info` (#3b82f6) | Info text/icons |
| `--status-success-bg` | `rgba(34, 197, 94, 0.15)` | `#dcfce7` | Success background |
| `--status-warning-bg` | `rgba(245, 158, 11, 0.15)` | `#fef3c7` | Warning background |
| `--status-error-bg` | `rgba(239, 68, 68, 0.15)` | `#fee2e2` | Error background |
| `--status-info-bg` | `rgba(59, 130, 246, 0.15)` | `#dbeafe` | Info background |

---

## Semantic: Opacity (Layer 2)

| Token | Value | Usage |
|-------|-------|-------|
| `--opacity-disabled` | `0.5` | Disabled controls |
| `--opacity-muted` | `0.6` | Muted elements |
| `--opacity-active` | `0.7` | Active/pressed state |
| `--opacity-hover` | `0.8` | Hover state |
| `--opacity-subtle` | `0.9` | Slightly faded |

---

## Semantic: Z-Index (Layer 2)

| Token | Value | Usage |
|-------|-------|-------|
| `--z-base` | `0` | Default stacking |
| `--z-above` | `1` | Above siblings |
| `--z-dropdown` | `50` | Dropdown menus |
| `--z-sticky` | `90` | Sticky elements |
| `--z-header` | `100` | App header |
| `--z-overlay` | `100` | Modal backdrop |
| `--z-modal` | `101` | Modal dialog |
| `--z-banner` | `1000` | Banners |
| `--z-progress` | `9999` | Progress bar |

---

## Semantic: Border Width (Layer 2)

| Token | Value | Usage |
|-------|-------|-------|
| `--border-width-thin` | `1px` | Default borders |
| `--border-width-medium` | `2px` | Focus rings, emphasis |
| `--border-width-thick` | `3px` | Heavy emphasis |

---

## Semantic: Sizing — Icons & Controls (Layer 2)

| Token | Value | Usage |
|-------|-------|-------|
| `--size-icon-xs` | `14px` | Extra-small icons |
| `--size-icon-sm` | `18px` | Small icons |
| `--size-icon-md` | `20px` | Medium icons (default) |
| `--size-icon-lg` | `24px` | Large icons |
| `--size-icon-button-sm` | `28px` | Small icon button hit target |
| `--size-button-icon-sm` | `32px` | Small button with icon |
| `--size-button-icon` | `40px` | Standard icon button |
| `--size-avatar-sm` | `32px` | Small avatar |
| `--size-avatar` | `40px` | Default avatar |
| `--size-avatar-lg` | `48px` | Large avatar |

## Semantic: Sizing — Toggle (Layer 2)

| Token | Value | Usage |
|-------|-------|-------|
| `--size-toggle-width` | `44px` | Toggle track width |
| `--size-toggle-height` | `24px` | Toggle track height |
| `--size-toggle-knob` | `20px` | Toggle knob diameter |
| `--toggle-knob-inset` | `2px` | Knob inset from track edge |
| `--toggle-knob-offset` | `20px` | Knob translate distance when on |

## Semantic: Sizing — Checkbox (Layer 2)

| Token | Value | Usage |
|-------|-------|-------|
| `--size-checkbox` | `18px` | Default checkbox size |
| `--size-checkbox-sm` | `16px` | Small checkbox size |

## Semantic: Sizing — Progress (Layer 2)

| Token | Value | Usage |
|-------|-------|-------|
| `--size-progress-bar` | `2px` | Progress bar height |
| `--size-progress-track` | `4px` | Progress track height |

## Semantic: Sizing — Dot / Badge (Layer 2)

| Token | Value | Usage |
|-------|-------|-------|
| `--size-dot` | `8px` | Status dot diameter |
| `--size-badge-min` | `18px` | Minimum badge width |

## Semantic: Sizing — Images (Layer 2)

| Token | Value | Usage |
|-------|-------|-------|
| `--size-image-xs` | `64px` | Extra-small image |
| `--size-image-sm` | `80px` | Small image (list rows) |
| `--size-image-md` | `120px` | Medium image (cards) |
| `--size-image-lg` | `200px` | Large image (detail view) |

---

## Semantic: Layout (Layer 2)

### Max/Min Widths

| Token | Value | Usage |
|-------|-------|-------|
| `--layout-max-width` | `1400px` | Outermost layout constraint |
| `--max-width-content` | `1200px` | Main content area |
| `--max-width-detail` | `1000px` | Detail pages |
| `--max-width-modal` | `600px` | Modal dialogs |
| `--max-width-form` | `520px` | Form containers |
| `--max-width-settings` | `600px` | Settings page |
| `--max-width-image-mobile` | `400px` | Image max width on mobile |
| `--max-width-dropdown` | `300px` | Dropdown max width |
| `--max-width-tag` | `120px` | Tag max width |
| `--min-width-login-box` | `320px` | Login form min width |
| `--min-width-dropdown` | `200px` | Dropdown min width |
| `--min-width-search` | `200px` | Search input min width |
| `--min-width-select` | `140px` | Select input min width |

### Page Layout

| Token | Value | Usage |
|-------|-------|-------|
| `--layout-page-padding` | `var(--space-3)` (12px) | Page outer padding |
| `--layout-page-padding-mobile` | `var(--space-2)` (8px) | Page padding on mobile |
| `--layout-page-gap` | `var(--space-3)` (12px) | Gap between page sections |
| `--layout-page-gap-mobile` | `var(--space-2)` (8px) | Page gap on mobile |

### Content Layout

| Token | Value | Mobile Override | Usage |
|-------|-------|-----------------|-------|
| `--layout-content-padding` | `var(--space-4)` (16px) | `var(--space-2)` (8px) at <=768px | Content inner padding |
| `--layout-content-padding-mobile` | `var(--space-4)` (16px) | — | Content padding on mobile |

### Header Layout

| Token | Value | Usage |
|-------|-------|-------|
| `--layout-header-padding` | `var(--space-3) var(--space-4)` | Header padding |
| `--layout-header-padding-mobile` | `var(--space-2) var(--space-3)` | Header padding on mobile |
| `--layout-header-button-size` | `var(--size-button-icon)` (40px) | Header button size |
| `--layout-header-radius` | `var(--radius-2xl)` (20px) | Header border radius |
| `--layout-header-height` | `60px` | Fixed header height |
| `--layout-banner-height` | `56px` | Banner bar height |

### Card Layout

| Token | Value | Usage |
|-------|-------|-------|
| `--layout-card-gap` | `var(--space-3)` (12px) | Grid gap between cards |
| `--layout-card-min-width` | `180px` | Card min width (desktop) |
| `--layout-card-min-width-mobile` | `140px` | Card min width (mobile) |
| `--layout-carousel-card-width` | `160px` | Carousel card fixed width |

### Toolbar Layout

| Token | Value | Usage |
|-------|-------|-------|
| `--layout-toolbar-gap` | `var(--space-4)` (16px) | Toolbar item gap |
| `--layout-toolbar-gap-mobile` | `var(--space-2)` (8px) | Toolbar gap on mobile |

---

## Semantic: Button (Layer 2)

| Token | Value | Usage |
|-------|-------|-------|
| `--button-height-default` | `var(--size-button-icon)` (40px) | Default button height |
| `--button-height-small` | `var(--size-button-icon-sm)` (32px) | Small button height |
| `--button-padding-default` | `var(--space-4)` (16px) | Default horizontal padding |
| `--button-padding-small` | `var(--space-3)` (12px) | Small horizontal padding |
| `--button-font-size-default` | `var(--font-size-sm)` (13px) | Default button font size |
| `--button-font-size-small` | `var(--font-size-xs)` (11px) | Small button font size |
| `--button-gap` | `var(--space-2)` (8px) | Gap between icon and label |
| `--button-radius` | `var(--radius-md)` (8px) | Default button border radius |

---

## Semantic: Form (Layer 2)

| Token | Value | Usage |
|-------|-------|-------|
| `--form-input-height` | `40px` | Text input / select height |
| `--form-textarea-min-height` | `60px` | Textarea minimum height |

---

## Semantic: Focus Ring (Layer 2)

| Token | Value | Usage |
|-------|-------|-------|
| `--outline-width` | `var(--border-width-medium)` (2px) | Focus outline width |
| `--outline-offset` | `2px` | Focus outline offset |

---

## Semantic: Shadow — Component (Layer 2)

### Themed (Dark/Light differ)

| Token | Dark | Light | Usage |
|-------|------|-------|-------|
| `--shadow-card` | `0 4px 6px -1px rgb(0 0 0 / 0.3), 0 2px 4px -2px rgb(0 0 0 / 0.3)` | `var(--shadow-md)` | Card elevation |
| `--shadow-dropdown` | `0 10px 15px -3px rgb(0 0 0 / 0.4), 0 4px 6px -4px rgb(0 0 0 / 0.4)` | `var(--shadow-lg)` | Dropdown/popover elevation |

### Non-themed

| Token | Value | Usage |
|-------|-------|-------|
| `--shadow-toggle-knob` | `0 1px 3px rgb(0 0 0 / 0.2)` | Toggle knob shadow |
| `--shadow-banner` | `0 -4px 20px rgb(0 0 0 / 0.15)` | Bottom banner upward shadow |

---

## Semantic: Overlay (Layer 2)

| Token | Value | Usage |
|-------|-------|-------|
| `--overlay-dark` | `rgb(0 0 0 / 0.4)` | Modal/drawer backdrop |
| `--overlay-light-20` | `rgb(255 255 255 / 0.2)` | Subtle light overlay |
| `--overlay-light-30` | `rgb(255 255 255 / 0.3)` | Medium light overlay |
| `--overlay-light-40` | `rgb(255 255 255 / 0.4)` | Strong light overlay |

# Spacing

## Scale

All spacing uses a 4px base unit. Use `--space-*` tokens for padding, margin, and gap.

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

## Layout Tokens

### Page

| Token | Value | Mobile Override | Usage |
|-------|-------|-----------------|-------|
| `--layout-page-padding` | `--space-3` (12px) | — | Outer page padding |
| `--layout-page-padding-mobile` | `--space-2` (8px) | — | Page padding on mobile |
| `--layout-page-gap` | `--space-3` (12px) | — | Gap between page sections |
| `--layout-page-gap-mobile` | `--space-2` (8px) | — | Page section gap on mobile |

### Content

| Token | Value | Mobile Override | Usage |
|-------|-------|-----------------|-------|
| `--layout-content-padding` | `--space-4` (16px) | `--space-2` (8px) at <=768px | Inner content padding |
| `--layout-content-padding-mobile` | `--space-4` (16px) | — | Content padding on mobile |

### Header

| Token | Value | Usage |
|-------|-------|-------|
| `--layout-header-padding` | `--space-3 --space-4` (12px 16px) | Header container padding |
| `--layout-header-padding-mobile` | `--space-2 --space-3` (8px 12px) | Header padding on mobile |
| `--layout-header-button-size` | `--size-button-icon` (40px) | Header action button size |
| `--layout-header-radius` | `--radius-2xl` (20px) | Header border radius |
| `--layout-header-height` | `60px` | Fixed header height |
| `--layout-banner-height` | `56px` | Banner bar height |

### Cards

| Token | Value | Usage |
|-------|-------|-------|
| `--layout-card-gap` | `--space-3` (12px) | Gap between cards in grid |
| `--layout-card-min-width` | `180px` | Minimum card width (desktop) |
| `--layout-card-min-width-mobile` | `140px` | Minimum card width (mobile) |
| `--layout-carousel-card-width` | `160px` | Fixed width for carousel cards |

### Toolbar

| Token | Value | Usage |
|-------|-------|-------|
| `--layout-toolbar-gap` | `--space-4` (16px) | Gap between toolbar items |
| `--layout-toolbar-gap-mobile` | `--space-2` (8px) | Toolbar gap on mobile |

## Max/Min Width Tokens

| Token | Value | Usage |
|-------|-------|-------|
| `--layout-max-width` | `1400px` | Outermost layout constraint |
| `--max-width-content` | `1200px` | Main content area |
| `--max-width-detail` | `1000px` | Detail/single-item pages |
| `--max-width-modal` | `600px` | Modal dialogs |
| `--max-width-form` | `520px` | Form containers |
| `--max-width-settings` | `600px` | Settings page |
| `--max-width-image-mobile` | `400px` | Image max width on mobile |
| `--max-width-dropdown` | `300px` | Dropdown menu max width |
| `--max-width-tag` | `120px` | Tag/chip max width (truncation) |
| `--min-width-login-box` | `320px` | Login form minimum width |
| `--min-width-dropdown` | `200px` | Dropdown menu minimum width |
| `--min-width-search` | `200px` | Search input minimum width |
| `--min-width-select` | `140px` | Select input minimum width |

## Rules

- Use `--space-*` tokens for padding, margin, and gap.
- Use `--layout-*` tokens for page structure and grid layout.
- Use `--max-width-*` and `--min-width-*` tokens for width constraints.
- Never use raw px or rem values in component CSS.
- The spacing scale is intentionally non-linear — there is no `--space-7`, `--space-9`, etc.

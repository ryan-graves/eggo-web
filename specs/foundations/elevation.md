# Elevation & Shadows

## Shadow Scale

### Primitive Shadows (Layer 1)

| Token | Value | Usage |
|-------|-------|-------|
| `--shadow-sm` | `0 1px 2px 0 rgb(0 0 0 / 0.05)` | Subtle lift (small controls) |
| `--shadow-md` | `0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)` | Medium elevation |
| `--shadow-lg` | `0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)` | High elevation |

### Themed Shadows (Layer 2)

| Token | Dark | Light | Usage |
|-------|------|-------|-------|
| `--shadow-card` | `0 4px 6px -1px rgb(0 0 0 / 0.3), 0 2px 4px -2px rgb(0 0 0 / 0.3)` | `--shadow-md` | Card surfaces |
| `--shadow-dropdown` | `0 10px 15px -3px rgb(0 0 0 / 0.4), 0 4px 6px -4px rgb(0 0 0 / 0.4)` | `--shadow-lg` | Dropdown menus, popovers |

Dark mode uses heavier shadow opacity (0.3–0.4) compared to light mode (0.1) to maintain visual depth on dark backgrounds.

### Component-Specific Shadows (Layer 2)

| Token | Value | Usage |
|-------|-------|-------|
| `--shadow-toggle-knob` | `0 1px 3px rgb(0 0 0 / 0.2)` | Toggle switch knob |
| `--shadow-banner` | `0 -4px 20px rgb(0 0 0 / 0.15)` | Bottom banner (upward shadow) |

## Z-Index Scale

| Token | Value | Usage |
|-------|-------|-------|
| `--z-base` | `0` | Default stacking context |
| `--z-above` | `1` | Slightly above siblings |
| `--z-dropdown` | `50` | Dropdown menus |
| `--z-sticky` | `90` | Sticky elements (toolbar) |
| `--z-header` | `100` | App header |
| `--z-overlay` | `100` | Modal backdrop overlay |
| `--z-modal` | `101` | Modal dialog (above overlay) |
| `--z-banner` | `1000` | Banners (above everything) |
| `--z-progress` | `9999` | Progress bar (topmost) |

## Rules

- Never use raw `box-shadow` values — always reference `--shadow-*` tokens.
- Never use raw `z-index` numbers — always reference `--z-*` tokens.
- Use themed shadows (`--shadow-card`, `--shadow-dropdown`) for surfaces that need to adapt between color modes.
- Use primitive shadows (`--shadow-sm`, `--shadow-md`, `--shadow-lg`) only when a non-themed shadow is intentional.
- The z-index scale is intentionally sparse to allow insertions if needed.

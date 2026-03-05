# Typography

## Font Families

| Token | Font | Usage |
|-------|------|-------|
| `--font-inter` | Inter | Body text, UI labels, buttons — all general typography |
| `--font-instrument-serif` | Instrument Serif | Headings in mono theme only |
| `--font-heading` | `var(--font-instrument-serif), Georgia, serif` | Set by mono theme; used by h1–h6 elements |

Inter is loaded as the base font on the `body` element. Instrument Serif is only activated when `data-ui-theme="mono"` is set.

## Font Size Scale

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

## Font Weights

| Token | Value |
|-------|-------|
| `--font-weight-normal` | `400` |
| `--font-weight-medium` | `500` |
| `--font-weight-semibold` | `600` |
| `--font-weight-bold` | `700` |

## Line Heights

| Token | Value | Usage |
|-------|-------|-------|
| `--line-height-none` | `1` | Single-line elements (icons, badges) |
| `--line-height-tight` | `1.2` | Large headings |
| `--line-height-snug` | `1.35` | Small headings, compact text |
| `--line-height-normal` | `1.5` | Body text (default) |
| `--line-height-relaxed` | `1.65` | Long-form reading text |

## Letter Spacing

| Token | Value | Usage |
|-------|-------|-------|
| `--letter-spacing-tighter` | `-0.02em` | Large display text |
| `--letter-spacing-tight` | `-0.01em` | Headings |
| `--letter-spacing-normal` | `0` | Body text (default) |
| `--letter-spacing-wide` | `0.025em` | Uppercase labels, small caps |
| `--letter-spacing-wider` | `0.05em` | Extra-wide tracking |

## Mono Theme Overrides

When `data-ui-theme="mono"` is active, all h1–h6 elements receive:

- `font-family: var(--font-heading)` (Instrument Serif with Georgia/serif fallbacks)
- `font-weight: var(--font-weight-normal)` (400)
- `letter-spacing: var(--letter-spacing-tight)` (-0.01em)

### Heading Sizes in Mono Theme

| Element | Font Size | Line Height |
|---------|-----------|-------------|
| `h1` | `--font-size-3xl` (28px) | `--line-height-tight` (1.2) |
| `h2` | `--font-size-xl` (18px) | `--line-height-snug` (1.35) |
| `h3` | `--font-size-xl` (18px) | `--line-height-snug` (1.35) |

## Rules

- Never use raw font sizes — always use `var(--font-size-*)`.
- Never use numeric font weights — always use `var(--font-weight-*)`.
- Never use raw line-height numbers — always use `var(--line-height-*)`.
- Never use raw letter-spacing values — always use `var(--letter-spacing-*)`.
- The `--font-heading` variable is only defined inside `[data-ui-theme='mono']` — do not reference it outside that context.

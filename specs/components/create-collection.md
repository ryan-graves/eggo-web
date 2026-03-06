# CreateCollection

## Metadata
- **Category**: input
- **Status**: stable
- **CSS**: CreateCollection.module.css

## Overview
**When to use**: As the onboarding form when a user has no collections. Centered card with collection name and owners inputs.
**When not to use**: For editing existing collections (use settings). For adding sets.

## Anatomy
1. **Container** (`.container`) -- centered flex layout, min-height 60vh
2. **Card** (`.card`) -- bordered form card, max-width 480px
3. **Title** (`.title`) -- heading text
4. **Description** (`.description`) -- subtitle text
5. **Form** (`.form`) -- vertical flex, 20px gap
6. **Field** (`.field`) -- label + input pair
7. **Label** (`.label`) -- field label
8. **Input** (`.input`) -- text input
9. **Hint** (`.hint`) -- helper text below input
10. **Error** (`.error`) -- error message block
11. **Button** (`.button`) -- submit button

## Tokens Used
| Token | Property | Value |
|-------|----------|-------|
| --space-8 | container/card padding | 32px |
| --space-5 | form gap | 20px |
| --space-6 | description bottom margin | 24px |
| --space-3, --space-4 | input padding | 12px 16px |
| --space-2 | field gap, title bottom margin, button top margin | 8px |
| --surface-primary | card bg, input bg | (themed) |
| --border-primary | card border | (themed) |
| --border-secondary | input border | (themed) |
| --border-focus | input focus border | (themed) |
| --radius-lg | card radius | 12px |
| --radius-md | input, error, button radius | 8px |
| --font-size-2xl | title font | 22px |
| --font-weight-semibold | title weight | 600 |
| --font-size-base | input, button font | 14px |
| --font-size-sm | label font, error font | 13px |
| --font-size-xs | hint font | 11px |
| --font-weight-medium | label, button weight | 500 |
| --text-primary | title, label, input text | (themed) |
| --text-secondary | description | (themed) |
| --text-tertiary | placeholder, hint | (themed) |
| --interactive-primary | button bg | (themed) |
| --interactive-primary-hover | button hover bg | (themed) |
| --text-inverse | button text | (themed) |
| --status-error | error text | (themed) |
| --status-error-bg | error bg | (themed) |
| --opacity-muted | disabled state | 0.6 |
| --transition-fast | border/bg transitions | 150ms ease-out |

## Props / API
No props. Component manages its own form state and calls `useCollection().createNewCollection()`.

## States
- **Default**: empty form ready for input
- **Focus** (input): --border-focus border
- **Disabled** (submitting): inputs disabled with opacity 0.6, button shows "Creating..."
- **Error**: red error block appears above button
- **Hover** (button): --interactive-primary-hover

## Code Example
```tsx
<CreateCollection />
```

## Cross-references
- Related: [Form](./form.md), [Button](./button.md)

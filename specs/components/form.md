# Form

## Metadata
- **Category**: input
- **Status**: stable
- **CSS**: styles/form.css (global utility classes)

## Overview
**When to use**: For all form layouts inside modals and standalone pages. Provides consistent field spacing, input styling, chip selectors, and error display.
**When not to use**: For inline filters or search inputs that don't follow the standard field+label pattern (use component-specific styles instead).

## Anatomy
1. **Form Fields Container** (`.form-fields`) -- vertical stack with 16px gap
2. **Field** (`.form-field`) -- vertical stack: label + input, 4px gap
3. **Label** (`.form-label`) -- 13px medium-weight secondary text
4. **Input / Select / Textarea** -- bordered input controls
5. **Chip Row** (`.form-chip-row`) -- horizontal wrap of selectable chips
6. **Error** (`.form-error`) -- error message with tinted background

## Tokens Used
| Token | Property | Value |
|-------|----------|-------|
| --space-4 | form-fields gap | 16px |
| --space-1 | field internal gap | 4px |
| --space-2, --space-3 | input padding | 8px 12px |
| --font-size-sm | label and input font size | 13px |
| --font-weight-medium | label and chip weight | 500 |
| --form-input-height | input/select height | 40px |
| --form-textarea-min-height | textarea minimum height | 60px |
| --radius-md | input border radius | 8px |
| --radius-full | chip border radius | 9999px |
| --border-secondary | input border color | (themed) |
| --interactive-primary | focus border, selected chip | (themed) |
| --interactive-primary-bg | selected chip background | (themed) |
| --surface-secondary | chip default background | (themed) |
| --surface-tertiary | chip hover background | (themed) |
| --text-secondary | label and chip text | (themed) |
| --status-error | error text color | (themed) |
| --status-error-bg | error background | (themed) |
| --transition-fast | border-color transitions | 150ms ease-out |

## Sub-components

### Input (`.form-input`, `.form-select`, `.form-textarea`)
- Height: 40px (textarea: auto, min 60px)
- Border: 1px solid --border-secondary
- Focus: border-color changes to --interactive-primary, no outline
- Textarea: resizable vertically, inherits font-family

### Date Input (`.form-date-input`)
- Same dimensions as `.form-input`
- Native appearance suppressed (`-webkit-appearance: none`)
- Text aligned left

### Chip (`.form-chip`)
- Pill-shaped (radius-full), 13px text
- Default: --surface-secondary background, transparent border
- Hover: --surface-tertiary background
- Selected (`.form-chip-selected`): --interactive-primary-bg background, --interactive-primary border and text

### Date + Occasion Row (`.form-date-occasion-row`)
- Horizontal flex layout, 12px gap
- Stacks vertically below 640px

### Error (`.form-error`)
- --status-error text on --status-error-bg background
- Padding: 8px 12px, radius-md

## States
- **Default**: --border-secondary border, --surface-primary background
- **Focus**: --interactive-primary border, no outline ring
- **Disabled**: not explicitly styled (handled per-component)
- **Error**: red-tinted block below fields

## Code Example
```tsx
<div className="form-fields">
  <div className="form-field">
    <label className="form-label">Set Name</label>
    <input className="form-input" type="text" />
  </div>
  <div className="form-field">
    <label className="form-label">Status</label>
    <div className="form-chip-row">
      <button className="form-chip form-chip-selected">Assembled</button>
      <button className="form-chip">Unopened</button>
    </div>
  </div>
  {error && <p className="form-error">{error}</p>}
</div>
```

## Cross-references
- Related: [Button](./button.md), [Modal](./modal.md), [CreateCollection](./create-collection.md)

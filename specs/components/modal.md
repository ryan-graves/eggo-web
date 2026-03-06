# Modal / Drawer

## Metadata
- **Category**: overlay
- **Status**: stable
- **CSS**: styles/modal.css (global utility classes)

## Overview
**When to use**: For secondary flows that overlay the main content -- filter sheets, edit forms, customization panels. Renders as a bottom sheet on mobile and a centered dialog on desktop.
**When not to use**: For full-page forms or primary navigation. For simple confirmations (use a smaller custom dialog).

## Anatomy
1. **Overlay** (`[data-vaul-overlay]`) -- fixed dark scrim
2. **Sheet** (`.modal-sheet`) -- the content panel
3. **Handle** (`[data-vaul-handle]`) -- swipeable drag indicator (mobile)
4. **Header** (`.modal-header`) -- title + close/back button
5. **Scroll Area** (`.modal-scroll-area`) -- scrollable content region
6. **Footer** (`.modal-footer`) -- action buttons row

## Tokens Used
| Token | Property | Value |
|-------|----------|-------|
| --overlay-dark | overlay background | rgb(0 0 0 / 0.4) |
| --z-overlay | overlay z-index | 100 |
| --z-modal | sheet z-index | 101 |
| --surface-primary | sheet & footer background | (themed) |
| --radius-xl | sheet top corners (mobile) / all corners (desktop) | 16px |
| --max-width-modal | desktop max width | 600px |
| --border-primary | header/footer border | (themed) |
| --font-size-lg | title font size | 16px |
| --font-weight-semibold | title weight | 600 |
| --text-primary | title color | (themed) |
| --space-4 | scroll area padding, footer side padding | 16px |
| --space-3 | footer gap and vertical padding | 12px |
| --space-2 | header top padding | 8px |
| --size-button-icon | icon button dimensions | 40px |
| --surface-secondary | icon button default bg | (themed) |
| --surface-tertiary | icon button hover bg | (themed) |
| --text-secondary | icon button default color | (themed) |
| --radius-md | icon button radius | 8px |
| --transition-fast | button transitions | 150ms ease-out |
| --opacity-active | icon button active state | 0.7 |
| --duration-slower | open/close animation duration | 500ms |
| --ease-vaul | animation easing | cubic-bezier(0.32, 0.72, 0, 1) |
| --modal-handle-bg | handle color | (themed) |
| --size-modal-handle | handle width | var(--size-avatar-lg) = 48px |

## Layout Behavior

### Mobile (< 1024px)
- Fixed to bottom, slides up from below
- Rounded top corners (16px)
- Max height: `calc(100dvh - 3rem)`
- Swipe-to-dismiss via Vaul handle

### Desktop (>= 1024px)
- Vertically centered using `translate: 0 50%` from `bottom: 50%`
- All corners rounded (16px)
- Max width: 600px, horizontally centered
- Max height: `calc(100dvh - 6rem)`
- Vaul pseudo-element hidden
- Scroll area shrinks to content (`flex: 0 1 auto`)

## Sub-components

### Icon Button (`.modal-icon-button`)
- 40x40px, --surface-secondary bg, --radius-md
- Hover: --surface-tertiary bg, --text-primary color
- Active: opacity 0.7

### Scroll Area (`.modal-scroll-area`)
- Flex: 1, overflow-y: auto
- iOS momentum scrolling, overscroll-behavior: contain
- Padding: 16px, gap: 16px

### Footer (`.modal-footer`)
- Flex row, 12px gap
- Bottom padding includes safe-area-inset-bottom
- Bordered top, --surface-primary background

## States
- **Closed**: hidden, `slideToBottom` / `fadeOut` animation
- **Open**: visible, `slideFromBottom` / `fadeIn` animation
- **Dragging**: Vaul manages transform interactively

## Code Example
```tsx
<Drawer.Root open={isOpen} onOpenChange={handleOpenChange}>
  <Drawer.Portal>
    <Drawer.Overlay />
    <Drawer.Content className="modal-sheet">
      <Drawer.Handle />
      <div className="modal-header">
        <Drawer.Title className="modal-title">Title</Drawer.Title>
        <Drawer.Close className="modal-icon-button">X</Drawer.Close>
      </div>
      <div className="modal-scroll-area">{/* content */}</div>
      <div className="modal-footer">
        <Drawer.Close className="btn-default btn-secondary">Cancel</Drawer.Close>
        <button className="btn-default btn-primary">Save</button>
      </div>
    </Drawer.Content>
  </Drawer.Portal>
</Drawer.Root>
```

## Cross-references
- Related: [Button](./button.md), [Form](./form.md), [FilterSheet](./filter-sheet.md), [HomeSectionsSheet](./home-sections-sheet.md)

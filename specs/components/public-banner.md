# PublicBanner

## Metadata
- **Category**: feedback
- **Status**: stable
- **CSS**: PublicBanner.module.css

## Overview
**When to use**: On public share pages to provide context and navigation. Shows different content for logged-in users (link back to own collection) vs anonymous visitors (sign-up CTA).
**When not to use**: For authenticated app pages.

## Anatomy
1. **Banner** (`.banner`) -- fixed bottom bar
2. **Content** (`.content`) -- centered flex row with max-width
3. **Text** (`.text`) -- descriptive label (hidden on mobile)
4. **Button** (`.button`) -- primary CTA (sign-up for anonymous)
5. **Link** (`.link`) -- secondary action (back to collection for logged-in)
6. **Close Button** (`.closeButton`) -- dismiss icon (anonymous only)

## Tokens Used
| Token | Property | Value |
|-------|----------|-------|
| --z-banner | z-index | 1000 |
| --surface-primary | banner bg | (themed) |
| --border-primary | top border | (themed) |
| --shadow-banner | upward shadow | 0 -4px 20px rgb(0 0 0 / 0.15) |
| --max-width-content | content max-width | 1200px |
| --space-2, --space-4 | banner padding | 8px 16px |
| --space-3 | content gap, link/button padding | 12px |
| --font-size-sm | text, button, link font | 13px |
| --font-weight-medium | button and link weight | 500 |
| --interactive-primary | CTA button bg | (themed) |
| --interactive-primary-hover | CTA button hover bg | (themed) |
| --text-inverse | CTA button text | (themed) |
| --text-primary | link text | (themed) |
| --text-secondary | descriptive text, link icon, close hover | (themed) |
| --text-tertiary | close button default | (themed) |
| --surface-secondary | link bg, close hover bg | (themed) |
| --surface-tertiary | link hover bg | (themed) |
| --radius-md | button, link, close radius | 8px |
| --size-button-icon-sm | close button dimensions | 32px |
| --transition-fast | hover transitions | 150ms ease-out |

## Props / API
No props. Component reads auth state internally via `useAuth()` hook. Dismissal state persisted in `localStorage`.

## Behavior
- **Anonymous, not dismissed**: Shows sign-up CTA with dismiss button
- **Anonymous, dismissed**: Hidden (null render)
- **Logged-in**: Shows "Back to my collection" link (always visible, not dismissable)
- **Loading**: Hidden (null render)

## Responsive Behavior
- **Mobile (< 640px)**: Text hidden, CTA button expands to fill, padding reduced
- **Desktop**: Full layout with text + actions

## States
- **Default**: fixed bottom bar with shadow
- **Hover** (CTA button): --interactive-primary-hover
- **Hover** (link): --surface-tertiary bg
- **Hover** (close): --surface-secondary bg, --text-secondary color

## Code Example
```tsx
<PublicBanner />
```

## Cross-references
- Related: [Header](./header.md), [Button](./button.md)

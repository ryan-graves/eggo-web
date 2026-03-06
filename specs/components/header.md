# Header

## Metadata
- **Category**: navigation
- **Status**: stable
- **CSS**: Header.module.css

## Overview
**When to use**: As the top-level persistent header on every page. Supports two variants: "main" for the home/collection view and "detail" for sub-pages with back navigation.
**When not to use**: For section headers within page content (use semantic headings directly).

## Anatomy
1. **Container** (`.header`) -- sticky bar with rounded corners
2. **Left Section** (`.leftSection`) -- flex row containing logo/back + optional content
3. **Logo** (`.logo`, main variant) -- "Eggo" brand text
4. **Back Button** (`.backButton`, detail variant) -- icon button for navigation
5. **Title** (`.title`, detail variant) -- page title text
6. **Right Content** (`.rightContent`) -- slot for action buttons

## Tokens Used
| Token | Property | Value |
|-------|----------|-------|
| --z-header | z-index | 100 |
| --space-3, --space-4 | padding | 12px 16px |
| --space-2, --space-3 | mobile padding | 8px 12px |
| --surface-primary | background | (themed) |
| --border-primary | border color | (themed) |
| --radius-2xl | border radius | 20px |
| --font-size-xl | logo font size | 18px |
| --font-weight-bold | logo weight | 700 |
| --font-size-lg | title font size | 16px |
| --font-weight-semibold | title weight | 600 |
| --text-primary | logo and title color | (themed) |
| --size-button-icon | back button dimensions | 40px |
| --surface-secondary | back button bg | (themed) |
| --surface-tertiary | back button hover bg | (themed) |
| --text-secondary | back button default color | (themed) |
| --radius-md | back button radius | 8px |
| --transition-fast | back button transitions | 150ms ease-out |
| --opacity-active | back button active | 0.7 |
| --opacity-disabled | loading state | 0.5 |

## Props / API
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| variant | `'main' \| 'detail'` | `'main'` | Main shows logo; detail shows back button + title |
| title | `string` | -- | Page title (detail variant) |
| backHref | `string` | `'/home'` | Fallback URL for back navigation (detail variant) |
| leftContent | `ReactNode` | -- | Content rendered after logo (main variant only) |
| rightContent | `ReactNode` | -- | Content rendered on the right side |

## Layout Behavior
- Sticky positioned with top offset accounting for safe-area-inset-top
- Desktop: `top: calc(12px + env(safe-area-inset-top))`, padding 12px 16px
- Mobile (<= 768px): `top: calc(8px + env(safe-area-inset-top))`, padding 8px 12px
- Title truncates with ellipsis on overflow

## States
- **Default**: solid background with subtle border
- **Hover** (back button): --surface-tertiary bg, --text-primary color
- **Active** (back button): opacity 0.7
- **Loading** (back button): opacity 0.5, pointer-events disabled

## Code Example
```tsx
<Header variant="main" leftContent={<CollectionSelector />} rightContent={<AddButton />} />
<Header variant="detail" title="Set Details" backHref="/home" />
```

## Cross-references
- Related: [CollectionSelector](./collection-selector.md), [NavigationProgress](./navigation-progress.md)

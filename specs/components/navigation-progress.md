# NavigationProgress

## Metadata
- **Category**: feedback
- **Status**: stable
- **CSS**: NavigationProgress.module.css

## Overview
**When to use**: At the top of the viewport to indicate client-side navigation is in progress. Renders automatically when a route transition is pending.
**When not to use**: For loading states within page content (use skeletons or spinners).

## Anatomy
1. **Bar** (`.bar`) -- thin horizontal line at viewport top

## Tokens Used
| Token | Property | Value |
|-------|----------|-------|
| --size-progress-bar | bar height | 2px |
| --z-progress | z-index | 9999 |
| --interactive-primary | bar color | (themed) |
| --duration-progress | animation duration | 2s |

## Animation
- `progress-grow` keyframes: scaleX(0) -> scaleX(0.7) at 50% -> scaleX(0.9) at 100%
- Transform origin: left
- Easing: ease-out, forwards fill
- Bar disappears when navigation completes (component unmounts)

## Props / API
No props. Reads navigation state from `useNavigationLoading()` hook. Returns `null` when no navigation is pending.

## States
- **Hidden**: no pending navigation (null render)
- **Active**: animated bar grows from left to ~90%

## Code Example
```tsx
<NavigationProgress />
```

## Cross-references
- Related: [Header](./header.md), [SetCard](./set-card.md) (both trigger navigation loading)

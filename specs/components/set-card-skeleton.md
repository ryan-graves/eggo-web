# SetCardSkeleton

## Metadata
- **Category**: feedback
- **Status**: stable
- **CSS**: SetCardSkeleton.module.css

## Overview
**When to use**: As a placeholder while set data is loading. Matches the exact dimensions and layout of SetCard for seamless transition.
**When not to use**: For other loading states (use component-specific skeletons or spinners).

## Anatomy
1. **Card** (`.card`) -- bordered container matching SetCard structure
2. **Image Container** (`.imageContainer`) -- 1:1 aspect ratio region
3. **Image Skeleton** (`.imageSkeleton`) -- shimmer block inset from edges
4. **Content** (`.content`) -- text region
5. **Name Skeleton** (`.nameSkeleton`) -- 85% width, 0.875rem height
6. **Set Number Skeleton** (`.setNumberSkeleton`) -- 30% width, 0.75rem height
7. **Meta** (`.meta`) -- status + owner skeleton row (full mode)
8. **Status Skeleton** (`.statusSkeleton`) -- 4rem wide badge placeholder
9. **Owner Skeleton** (`.ownerSkeleton`) -- 2.5rem wide badge placeholder
10. **Details** (`.details`) -- piece count + theme skeletons (full mode)
11. **Status Compact Skeleton** (`.statusCompactSkeleton`) -- compact mode status

## Tokens Used
| Token | Property | Value |
|-------|----------|-------|
| --surface-secondary | shimmer gradient start/end | (themed) |
| --surface-tertiary | shimmer gradient midpoint | (themed) |
| --duration-shimmer | shimmer animation duration | 1.5s |
| --radius-sm | skeleton block radius, badge skeleton radius | 6px |
| --radius-md | card radius, image skeleton radius | 8px |
| --surface-primary | card background | (themed) |
| --border-primary | card border | (themed) |
| --space-3 | image inset, content side padding | 12px |
| --space-2 | content top padding, meta padding-top, detail gap | 8px |
| --space-1 | content gap, meta gap, detail margin-top | 4px |

## Animation
- `shimmer` keyframes: background-position slides from -200% to 200%
- Linear gradient at 90deg through secondary -> tertiary -> secondary
- Background-size: 200% 100%
- Duration: 1.5s, ease-in-out, infinite

## Props / API
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| compact | `boolean` | `false` | Matches SetCard compact mode layout |

## States
- **Default**: continuous shimmer animation (no interactive states)

## Code Example
```tsx
<SetCardSkeleton />
<SetCardSkeleton compact />
```

## Cross-references
- Related: [SetCard](./set-card.md), [SetCarousel](./set-carousel.md), [SetList](./set-list.md)

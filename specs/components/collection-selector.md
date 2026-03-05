# CollectionSelector

## Metadata
- **Category**: navigation
- **Status**: stable
- **CSS**: CollectionSelector.module.css

## Overview
**When to use**: In the Header to switch between collections when a user has multiple collections. Falls back to a static label when only one collection exists.
**When not to use**: For general-purpose dropdowns or select inputs.

## Anatomy
1. **Container** (`.container`) -- relative-positioned wrapper for dropdown
2. **Trigger** (`.trigger`) -- button showing selected collection name + chevron
3. **Settings Button** (`.settingsButton`) -- optional gear icon for collection settings
4. **Chevron** (`.chevron`) -- animated rotation indicator
5. **Dropdown** (`.dropdown`) -- positioned list of collection options
6. **Option** (`.option`) -- collection name + owners row
7. **Single Container** (`.singleContainer`) -- static label variant (1 collection)

## Tokens Used
| Token | Property | Value |
|-------|----------|-------|
| --surface-secondary | container/single bg | (themed) |
| --surface-tertiary | settings hover bg | (themed) |
| --radius-md | container/option/settings radius | 8px |
| --radius-lg | dropdown radius | 12px |
| --radius-sm | settings button radius | 6px |
| --font-size-sm | trigger, option name, single label font | 13px |
| --font-size-xs | option owners font | 11px |
| --font-weight-medium | trigger name, option name, single label weight | 500 |
| --text-primary | selected name, option name, settings hover | (themed) |
| --text-secondary | trigger text, option hover | (themed) |
| --text-tertiary | chevron, settings default, option owners | (themed) |
| --space-1 | dropdown padding, trigger vertical padding | 4px |
| --space-2 | trigger gap, option padding | 8px |
| --space-3 | trigger/single/option side padding | 12px |
| --size-icon-button-sm | settings button dimensions | 28px |
| --min-width-dropdown | dropdown min-width | 200px |
| --max-width-dropdown | dropdown max-width | 300px |
| --z-dropdown | dropdown z-index | 50 |
| --shadow-dropdown | dropdown shadow | (themed) |
| --border-primary | dropdown border | (themed) |
| --border-focus | trigger focus outline | (themed) |
| --border-width-medium | focus outline width | 2px |
| --outline-offset | focus outline offset | 2px |
| --transition-fast | all transitions | 150ms ease-out |

## Props / API
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| collections | `Collection[]` | -- | All available collections |
| activeCollection | `Collection \| null` | -- | Currently selected collection |
| onSelect | `(collection) => void` | -- | Selection handler |
| onSettingsClick | `() => void` | -- | Optional settings button handler |

## Behavior
- Single collection: renders static label with optional settings button
- Multiple collections: renders trigger + dropdown
- Closes on outside click, Escape key
- Chevron rotates 180deg when open

## States
- **Default** (trigger): --text-secondary color
- **Hover** (trigger): --text-primary color
- **Focus-visible** (trigger): 2px --border-focus outline
- **Open**: dropdown visible, chevron rotated
- **Option hover**: --surface-secondary background
- **Option selected**: --surface-secondary background (persistent)

## Code Example
```tsx
<CollectionSelector
  collections={collections}
  activeCollection={active}
  onSelect={handleSelect}
  onSettingsClick={() => router.push('/settings')}
/>
```

## Cross-references
- Related: [Header](./header.md)

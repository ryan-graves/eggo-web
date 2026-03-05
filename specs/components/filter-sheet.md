# FilterSheet

## Metadata
- **Category**: overlay
- **Status**: stable
- **CSS**: FilterSheet.module.css

## Overview
**When to use**: As the mobile filter/sort interface for the set list. Opens as a bottom sheet (Vaul Drawer) with filter selects and sort controls.
**When not to use**: On desktop -- desktop uses inline filter controls in SetList.

## Anatomy
1. **Drawer** -- Vaul bottom sheet using `.modal-sheet`, `.modal-header`, `.modal-scroll-area`, `.modal-footer`
2. **Section** (`.section`) -- labeled filter group
3. **Select** (`.select`) -- full-width native select with custom chevron
4. **Divider** (`.divider`) -- horizontal separator between filters and sort
5. **Sort Row** (`.sortRow`) -- select + direction toggle button
6. **Footer** -- Clear All (conditional) + Apply buttons

## Tokens Used
| Token | Property | Value |
|-------|----------|-------|
| --space-2 | section gap | 8px |
| --space-3, --space-4 | select padding, footer padding | 12px, 16px |
| --font-size-sm | section label font size | 13px |
| --font-size-base | select, footer button font size | 14px |
| --font-weight-medium | label, button weight | 500 |
| --text-primary | label, select, sort text | (themed) |
| --border-secondary | select/button border | (themed) |
| --border-primary | divider color | (themed) |
| --border-focus | select focus border | (themed) |
| --surface-primary | select background | (themed) |
| --surface-secondary | button hover bg | (themed) |
| --radius-md | select, button radius | 8px |
| --interactive-primary | apply button bg | (themed) |
| --interactive-primary-hover | apply button hover bg | (themed) |
| --text-inverse | apply button text | (themed) |
| --text-secondary | clear button text | (themed) |
| --transition-fast | hover transitions | 150ms ease-out |

## Props / API
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| isOpen | `boolean` | -- | Controls sheet visibility |
| onClose | `() => void` | -- | Called when sheet is dismissed |
| statusFilter | `SetStatus \| 'all'` | -- | Current status filter value |
| onStatusChange | `(status) => void` | -- | Status filter change handler |
| ownerFilter | `string` | -- | Current owner filter value |
| onOwnerChange | `(owner) => void` | -- | Owner filter change handler |
| themeFilter | `string` | -- | Current theme filter value |
| onThemeChange | `(theme) => void` | -- | Theme filter change handler |
| sortField | `string` | -- | Current sort field |
| onSortFieldChange | `(field) => void` | -- | Sort field change handler |
| sortDirection | `'asc' \| 'desc'` | -- | Current sort direction |
| onSortDirectionChange | `(dir) => void` | -- | Sort direction change handler |
| availableOwners | `string[]` | -- | Owner options for filter |
| availableThemes | `string[]` | -- | Theme options for filter |
| statusOptions | `{ value, label }[]` | -- | Status select options |
| sortOptions | `{ value, label }[]` | -- | Sort select options |
| hideStatus | `boolean` | `false` | Hides the status filter section |

## States
- **Default**: selects show current filter values
- **Focus** (select): --border-focus border
- **Hover** (sort/clear buttons): --surface-secondary bg
- **Hover** (apply button): --interactive-primary-hover bg
- **Filters active**: "Clear All Filters" button appears in footer

## Code Example
```tsx
<FilterSheet
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  statusFilter="all"
  onStatusChange={setStatusFilter}
  ownerFilter="all"
  onOwnerChange={setOwnerFilter}
  themeFilter="all"
  onThemeChange={setThemeFilter}
  sortField="dateReceived"
  onSortFieldChange={setSortField}
  sortDirection="desc"
  onSortDirectionChange={setSortDirection}
  availableOwners={['Ryan', 'Alyssa']}
  availableThemes={['Star Wars', 'City']}
  statusOptions={statusOptions}
  sortOptions={sortOptions}
/>
```

## Cross-references
- Related: [Modal](./modal.md), [SetList](./set-list.md), [FilterTags](./filter-tags.md)

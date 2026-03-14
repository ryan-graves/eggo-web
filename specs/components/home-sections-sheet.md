# HomeSectionsSheet

## Metadata
- **Category**: overlay
- **Status**: stable
- **CSS**: HomeSectionsSheet.module.css

## Overview
**When to use**: To customize which sections appear on the collection home page. Supports drag-to-reorder, removal, and adding smart/theme sections.
**When not to use**: For filter or sort controls (use FilterSheet).

## Anatomy
1. **Drawer** -- Vaul bottom sheet using modal utility classes
2. **Header** -- title + close (list view) or back + title (add views)
3. **Section List** (`.sectionList`) -- drag-and-drop reorderable list
4. **Section Item** (`.sectionItem`) -- drag handle + icon + info + remove
5. **Drag Handle** (`.dragHandle`) -- grip dots for reordering
6. **Section Icon** (`.sectionIcon`) -- contextual SVG icon per section type
7. **Section Info** (`.sectionInfo`) -- name + description
8. **Remove Button** (`.removeButton`) -- X button per section
9. **Add Buttons** (`.addButtons`) -- dashed-border buttons to add sections
10. **Add List** (`.addList`) -- picker list in add-smart/add-theme views
11. **Footer** -- Reset (conditional) + Cancel + Save

## Tokens Used
| Token | Property | Value |
|-------|----------|-------|
| --space-2 | section list gap, add list gap | 8px |
| --space-3 | section item padding, info gap | 12px |
| --space-4 | add button/footer padding, empty padding | 16px |
| --space-8 | empty draft/add list empty padding | 32px |
| --space-1 | info internal gap, add list internal gap, empty paragraph margin | 4px |
| --surface-secondary | section item bg, hover states | (themed) |
| --radius-md | section item, button, add list item radius | 8px |
| --font-size-sm | section name, button, add item name, empty text | 13px |
| --font-size-xs | section description, add item description | 11px |
| --font-size-base | cancel/save button font | 14px |
| --font-weight-medium | name, button weight | 500 |
| --text-primary | section name, hover text, add item name | (themed) |
| --text-secondary | icon, remove, reset, add button, description, cancel | (themed) |
| --text-tertiary | drag handle, description | (themed) |
| --text-inverse | save button text | (themed) |
| --border-secondary | add button dashed border, cancel border | (themed) |
| --interactive-primary | add button hover border/text, save bg | (themed) |
| --interactive-primary-hover | save hover bg | (themed) |
| --status-error-bg | remove hover bg | (themed) |
| --status-error | remove hover color | (themed) |
| --size-icon-button-sm | remove button dimensions | 28px |
| --size-button-icon | header spacer width | 40px |
| --radius-sm | remove button radius | 6px |
| --transition-fast | all hover transitions | 150ms ease-out |

## Props / API
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| isOpen | `boolean` | -- | Controls sheet visibility |
| onClose | `() => void` | -- | Called on dismiss |
| sections | `HomeSectionConfig[]` | -- | Current section configuration |
| onSave | `(sections) => void` | -- | Save handler with updated config |
| availableThemes | `string[]` | -- | Theme names available for theme sections |

## Views
- **list**: Reorderable section list + add buttons + footer
- **add-smart**: Picker for smart section types not yet added
- **add-theme**: Picker for theme sections from collection themes

## Behavior
- Draft state resets from props each time sheet opens
- Drag-and-drop via @dnd-kit (PointerSensor + KeyboardSensor)
- "Reset" button appears when config differs from defaults
- Sections already in draft are excluded from add pickers

## States
- **Default**: list of configured sections with drag handles
- **Dragging**: dragged item at reduced opacity (0.4), elevated z-index
- **Empty draft**: centered "No sections configured" message
- **Hover** (add button): --interactive-primary border and text
- **Hover** (remove): --status-error-bg bg, --status-error color
- **Hover** (add list item): --surface-secondary bg

## Code Example
```tsx
<HomeSectionsSheet
  isOpen={showCustomize}
  onClose={() => setShowCustomize(false)}
  sections={currentSections}
  onSave={handleSaveSections}
  availableThemes={['Star Wars', 'City', 'Technic']}
/>
```

## Cross-references
- Related: [Modal](./modal.md), [CollectionHome](./collection-home.md), [SetCarousel](./set-carousel.md)

---
name: Eggo
description: A monochrome, editorial catalog for a personal Lego collection.
colors:
  page-dark: "#09090b"
  surface-dark: "#18181b"
  surface-dark-raised: "#1f1f23"
  surface-dark-overlay: "#27272a"
  page-light: "#fafafa"
  surface-light: "#ffffff"
  surface-light-raised: "#f4f4f5"
  near-white: "#f4f4f5"
  near-black: "#18181b"
  text-muted-dark: "#a1a1aa"
  text-muted-light: "#52525b"
  text-faint: "#71717a"
  border-dark: "#27272a"
  border-dark-strong: "#3f3f46"
  border-light: "#e4e4e7"
  border-light-strong: "#d4d4d8"
  status-success: "#22c55e"
  status-warning: "#f59e0b"
  status-error: "#ef4444"
  status-info: "#3b82f6"
typography:
  display:
    fontFamily: "Instrument Serif, Georgia, serif"
    fontSize: "1.75rem"
    fontWeight: 400
    lineHeight: 1.2
    letterSpacing: "-0.01em"
  headline:
    fontFamily: "Instrument Serif, Georgia, serif"
    fontSize: "1.25rem"
    fontWeight: 400
    lineHeight: 1.3
    letterSpacing: "-0.01em"
  title:
    fontFamily: "Instrument Serif, Georgia, serif"
    fontSize: "1.125rem"
    fontWeight: 400
    lineHeight: 1.4
    letterSpacing: "-0.01em"
  body:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "0"
    fontFeature: "'cv11', 'ss01'"
  label:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 500
    lineHeight: 1.35
    letterSpacing: "0"
rounded:
  sm: "0.375rem"
  md: "0.5rem"
  lg: "0.75rem"
  xl: "1rem"
  "2xl": "1.25rem"
  full: "9999px"
spacing:
  "1": "0.25rem"
  "2": "0.5rem"
  "3": "0.75rem"
  "4": "1rem"
  "6": "1.5rem"
  "8": "2rem"
components:
  button-primary:
    backgroundColor: "{colors.near-white}"
    textColor: "{colors.near-black}"
    rounded: "{rounded.full}"
    padding: "8px 16px"
  button-primary-hover:
    backgroundColor: "{colors.surface-light}"
    textColor: "{colors.near-black}"
  button-secondary:
    backgroundColor: "{colors.surface-dark}"
    textColor: "{colors.near-white}"
    rounded: "{rounded.full}"
    padding: "8px 16px"
  button-ghost:
    textColor: "{colors.near-white}"
    rounded: "{rounded.full}"
    padding: "8px 16px"
  card:
    backgroundColor: "{colors.surface-dark}"
    rounded: "{rounded.md}"
  input:
    backgroundColor: "{colors.surface-dark}"
    textColor: "{colors.near-white}"
    rounded: "{rounded.md}"
    padding: "8px 12px"
    height: "40px"
  chip:
    backgroundColor: "{colors.surface-dark-raised}"
    textColor: "{colors.text-muted-dark}"
    rounded: "{rounded.full}"
    padding: "4px 12px"
  chip-selected:
    backgroundColor: "{colors.surface-dark-raised}"
    textColor: "{colors.near-white}"
    rounded: "{rounded.full}"
  header:
    backgroundColor: "{colors.surface-dark}"
    rounded: "{rounded.2xl}"
    padding: "12px 16px"
---

# Design System: Eggo

## 1. Overview

**Creative North Star: "The Display Shelf"**

Eggo is a frame around a collection. Like a well-built shelf, the interface lines the
sets up cleanly, holds them at a comfortable distance, and otherwise gets out of the
way. Nothing on screen competes with a set's own photograph; the interface stays neutral
enough that each set image reads like an object on display, with chrome, borders,
controls, and type quiet enough to disappear.

The system runs in a single canonical UI — an editorial monochrome catalog — across
both **light and dark color modes**. The user's color mode preference follows the OS
by default. Components reference the semantic aliases in `theme.css`
(`--surface-primary`, `--text-secondary`, `--interactive-primary`, etc.) so a single
component adapts cleanly across both modes.

The visual treatment: a neutral gray ramp, Instrument Serif for every heading, Inter
for everything else, no decorative accent color. The only saturated colors are the four
functional status signals (success, warning, error, info), and they appear only on
status badges, never as decoration.

This system explicitly rejects the **generic SaaS dashboard** (no hero-metric blocks, no
gradient accents, no identical icon-card grids), the **childish toy-store** look (no
primary-color overload, no bubbly type), the **spreadsheet tool** (sets are shown as
images, never reduced to table rows), and the **cluttered marketplace** (no ad-dense,
visually noisy listings).

**Key Characteristics:**

- Monochrome neutrals; saturated color is functional only (status signals).
- Editorial pairing: Instrument Serif headings at normal weight, Inter body at 14px.
- Flat at rest; depth comes from tonal layering, with shadow reserved for hover.
- Tactile, confident controls: solid fills, capsule buttons, clear hover response.
- The set image is always the loudest element on screen.

## 2. Colors

A neutral gray ramp carries the entire interface; the palette has no accent hue.

### Primary

There is no chromatic primary. The "primary" interactive color is a **tonal inversion**:
a near-white surface (`#f4f4f5`) on dark mode, a near-black surface (`#18181b`) on light
mode. Primary actions earn attention through contrast against the monochrome field, not
through hue.

- **Near-White** (`#f4f4f5`): Fill for primary buttons in dark mode; brightest text.
- **Near-Black** (`#18181b`): Fill for primary buttons in light mode; primary text in
  light mode; raised surfaces in dark mode.

### Neutral

The gray ramp does all structural work, backgrounds, surfaces, text, borders.

- **Page Dark** (`#09090b`): The dark-mode page background, the unlit wall.
- **Surface Dark** (`#18181b`) / **Raised** (`#1f1f23`) / **Overlay** (`#27272a`):
  Stepped dark surfaces. Depth is read from these tonal steps, not from shadow.
- **Page Light** (`#fafafa`) / **Surface Light** (`#ffffff`) / **Raised** (`#f4f4f5`):
  The light-mode equivalents.
- **Text Muted** (`#a1a1aa` dark / `#52525b` light): Secondary text, labels.
- **Text Faint** (`#71717a`): Tertiary text, set numbers, timestamps, placeholders.
- **Borders** (`#27272a`/`#3f3f46` dark, `#e4e4e7`/`#d4d4d8` light): Hairline 1px
  dividers and container edges. Borders are always 1px.

### Status (functional only)

- **Success** (`#22c55e`), **Warning** (`#f59e0b`), **Error** (`#ef4444`),
  **Info** (`#3b82f6`): Reserved for status badges and validation feedback. Each is
  paired with a low-opacity tinted background. Never used decoratively.

### Named Rules

**The Monochrome Rule.** The interface has no accent hue. If a color other than the gray
ramp appears, it is a status signal carrying specific meaning, or it is a bug. The legacy
orange (`#f97316`) is not the brand and must not be reintroduced as decoration.

**The Image-Is-The-Color Rule.** Color on screen comes from the set photographs. The UI
stays neutral so those photographs are never out-shouted.

## 3. Typography

**Display Font:** Instrument Serif (with Georgia, serif fallback)
**Body Font:** Inter (with system-ui, sans-serif fallback)

**Character:** A deliberate editorial pairing. Instrument Serif is a high-contrast serif
used at its normal weight, giving headings a printed-catalog quality, considered, a
little refined, never shouty. Inter handles every functional surface at a compact 14px
with the `cv11` and `ss01` stylistic sets enabled for a cleaner single-story look.

### Hierarchy

- **Display** (Instrument Serif, 400, 1.75rem / 28px, line-height 1.2): Page titles,
  collection names. The largest type on any screen.
- **Headline** (Instrument Serif, 400, 1.25rem / 20px, line-height 1.3): Section headings.
- **Title** (Instrument Serif, 400, 1.125rem / 18px, line-height 1.4): Subsection and
  card-group headings.
- **Body** (Inter, 400, 0.875rem / 14px, line-height 1.5): Default UI and reading text.
  Cap measured prose at 65–75ch.
- **Label** (Inter, 500, 0.8125rem / 13px): Form labels, metadata, button text. Medium
  weight; never uppercased.

### How heading typography is actually applied

The canonical heading rules live in `src/styles/theme.css` as plain element selectors
on `h1`–`h6`. They set `font-family: var(--font-heading)` (Instrument Serif),
`font-weight: 400`, and a per-level `font-size` and `line-height`. A plain class
selector in any CSS Module (e.g. `.title`) wins on specificity over the element
selector and applies whatever font properties it declares.

The implication for new code:

- **The default expectation is that headings inherit from theme.css.** Don't restate
  the heading font on every CSS Module class — leave `font-family`, `font-weight`,
  `letter-spacing`, and the per-level `font-size` off the class and let the theme
  rule paint them.
- **Only declare a font property on a class when you actually want to deviate** from
  the system scale: an oversized marketing display (the landing `.tagline` /
  `.featureHeading` pattern), or a size override for a cramped container (the
  Header's `.title` declares only `font-size: lg` because Display-scale 28px
  doesn't fit in the header bar — it still inherits Instrument Serif from `h1`).

### Named Rules

**The Light-Serif Rule.** Headings are serif at normal weight (400). A bold serif heading
is forbidden; emphasis comes from size, never from weighting the serif.

**The Capped-Measure Rule.** Body copy never runs wider than 75ch. Eggo's content is
short by nature, so a stray full-width paragraph reads as a mistake.

## 4. Elevation

Eggo is **flat at rest**. Depth is communicated almost entirely through tonal layering:
a raised surface is a lighter step on the gray ramp, not a shadowed one. Shadows exist
but are an interaction response, not a resting style.

### Shadow Vocabulary

- **Card hover** (`box-shadow: 0 4px 6px -1px rgb(0 0 0 / 30%), 0 2px 4px -2px rgb(0 0 0 / 30%)`):
  Appears on a set card only on hover, and only on hover-capable devices.
- **Dropdown** (`box-shadow: 0 10px 15px -3px rgb(0 0 0 / 40%), 0 4px 6px -4px rgb(0 0 0 / 40%)`):
  For menus and popovers that genuinely float above the page.
- **Banner** (`box-shadow: 0 -4px 20px rgb(0 0 0 / 15%)`): The single upward shadow, for
  the public-view banner anchored to the viewport edge.

### Named Rules

**The Flat-At-Rest Rule.** Surfaces carry no shadow at rest. A shadow is feedback, it
answers a hover or marks something that truly floats (menu, banner). A resting card with
a drop shadow is wrong; raise it with a lighter tonal step instead.

## 5. Components

Components are **tactile and confident**: solid fills, honest borders, and a clear
response to hover and focus. They feel clickable without resorting to decoration.

### Buttons

- **Shape:** Capsule. Every button is fully pill-shaped
  (`border-radius: 9999px`). This is the system's most distinctive component signature.
- **Primary:** Tonal-inversion fill, near-white on dark, near-black on light, with
  inverse text. Padding `8px 16px` (default) or `8px 12px` (small).
- **Secondary:** Neutral surface fill with a 1px border and primary text.
- **Ghost:** Transparent; on hover it fills with the secondary surface tone.
- **Danger:** Tinted error background with error-colored text; on hover the fill becomes
  solid error and the text flips to inverse.
- **Hover / Focus:** Fast (150ms) color transition. Focus shows a 2px outline in the
  focus-border tone, offset 2px. `:active` drops opacity to 0.7 for instant touch feedback.

### Chips

- **Style:** Pill-shaped (`radius full`), neutral raised-surface background, muted text.
- **State:** Selected chips brighten the text to primary and gain a subtle border. Used
  for status and owner filters.

### Cards (Set Card)

- **Corner Style:** Gently rounded (`radius md`, 8px).
- **Background:** Neutral surface (`surface-primary`) with a 1px primary border.
- **Shadow Strategy:** None at rest. On hover (hover-capable devices only) the border
  brightens one step and the card hover shadow fades in.
- **Structure:** A square (1:1) image well with `12px` inset padding so the set photo
  floats, then a content block: **name** (rendered as `<h3>`, so it picks up the
  Title scale — Instrument Serif at 18px, normal weight, 2-line clamp), set number,
  and a metadata row of status badge and owner tag pushed to the bottom.
- **Internal Padding:** `8px 12px 12px` on the content block.

### Inputs / Fields

- **Style:** 1px border in the secondary-border tone, neutral surface fill, `radius md`,
  `40px` tall. On mobile, font-size is forced to 16px to prevent iOS zoom.
- **Focus:** Border color shifts to the interactive tone. No glow, no ring beyond the
  global focus outline.
- **Error:** Error-colored helper text on a tinted error background block.

### Navigation (Header)

- A floating, fully-contained bar: it sticks a small margin below the viewport top,
  sits on a neutral surface with a 1px border, and is heavily rounded (`radius 2xl`,
  20px) so it reads as a discrete object, not an edge-to-edge chrome strip.
- The "Eggo" wordmark and page title both render in Instrument Serif (the system
  default). The page title is sized one step down from Display scale to fit the
  header bar, and truncates with an ellipsis when too long.
- The back button and right-side actions are 40px neutral icon buttons.

### Modals (Drawer)

- All modals and sheets are Vaul drawers sharing one set of `modal-*` classes. They
  slide in with the `cubic-bezier(0.32, 0.72, 0, 1)` "vaul" easing and carry a drag
  handle. They stay mounted, hidden by an `open` prop, rather than unmounting on close.

## 6. Do's and Don'ts

### Do:

- **Do** keep the system monochrome. Structure with the gray ramp; let set photographs
  supply the only real color.
- **Do** set every heading in Instrument Serif at weight 400.
- **Do** keep surfaces flat at rest and convey depth with a lighter tonal step.
- **Do** make buttons fully capsule-shaped (`border-radius: 9999px`).
- **Do** keep all borders at 1px hairlines.
- **Do** reserve the four status colors for status badges and validation only.

### Don't:

- **Don't** introduce a decorative accent hue. Saturated color is reserved for the
  four functional status signals; everything else is the gray ramp.
- **Don't** build a **generic SaaS dashboard**: no hero-metric blocks, no gradient text
  or gradient accents, no identical icon-card grids.
- **Don't** make it a **childish toy-store**: no primary-color overload, no bubbly or
  rounded display fonts, no cartoon styling.
- **Don't** turn the collection into a **spreadsheet**: sets are shown as images in
  cards, never collapsed into cold table rows.
- **Don't** let a screen become a **cluttered marketplace**: no dense, noisy, ad-style
  listings competing for attention.
- **Don't** put a drop shadow on a resting surface. A shadow is hover feedback or it
  marks something that truly floats.
- **Don't** use a colored side-stripe (`border-left`/`border-right` > 1px) on cards,
  list items, or alerts.
- **Don't** bold the serif headings. Emphasize with size, not weight.

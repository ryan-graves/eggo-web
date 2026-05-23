---
target: Set detail page (src/app/(app)/set/[id]/page.tsx)
total_score: 18
p0_count: 2
p1_count: 2
timestamp: 2026-05-23T00-55-28Z
slug: src-app-app-set-id-page-tsx
---
# Set Detail Page — Design Critique

**Target**: [`src/app/(app)/set/[id]/page.tsx`](src/app/(app)/set/[id]/page.tsx) + [`page.module.css`](src/app/(app)/set/[id]/page.module.css)
**Register**: Product · **Theme**: Mono (canonical)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Skeleton + retry-button feedback solid; no success confirmation when `Retry` clears the banner |
| 2 | Match System / Real World | 3 | "Got this on X for Y" is human; "Built before" pill is jargon-shaped |
| 3 | User Control and Freedom | 2 | No prev/next, no "back to theme", deep-linked users need two backs |
| 4 | Consistency and Standards | 2 | Edit button is `radius-md` square in a capsule-button system; five different radii on one screen |
| 5 | Error Prevention | n/a | No destructive actions live on this surface |
| 6 | Recognition Rather Than Recall | 3 | Stats visible, pencil universally understood |
| 7 | Flexibility and Efficiency | 1 | Status change — the most frequent action — costs three taps + full-screen context switch + network round-trip |
| 8 | Aesthetic and Minimalist Design | 2 | Four decorative metadata pills, "for fun" filler, loud red banner, container-stack hierarchy |
| 9 | Error Recovery | 2 | "Background removal failed" toast offers no remediation path |
| 10 | Help and Documentation | n/a | Not expected on a detail page |
| **Total** | | **18/32** | **Below average** (most real UIs land 20–32; two heuristics n/a on this surface) |

## Anti-Patterns Verdict

**Verdict: minor tells — not AI slop, but not clean.** Bones are right (image-led, neutral, capped width, sticky image well, no gradient accents, no card grid, no hero-metric blocks). Four specific tics break the doctrine:

| Pattern | Where | Why it's a tell |
|---|---|---|
| Bold serif heading in source | [page.module.css:146](src/app/(app)/set/[id]/page.module.css#L146) | Violates DESIGN.md's Light-Serif Rule. Only renders correctly because `[data-ui-theme='mono'] h1` in theme.css beats `.name` on specificity (0,1,1 vs 0,1,0). Source still declares `font-weight: var(--font-weight-bold)`. Cascade-luck, not intent. |
| Metadata pillbox row | [page.module.css:162-168](src/app/(app)/set/[id]/page.module.css#L162-L168) | Four `radius-full` neutral pills for set #, pieces, year, theme. Pills imply interactivity (the rest of the system uses capsules for buttons and chips for filters). These do nothing on tap. |
| Mid-content red banner | [page.module.css:101-114](src/app/(app)/set/[id]/page.module.css#L101-L114) | Uses `--status-error-bg` / `--status-error` for "processed image unavailable" — which is a maintenance affordance, not a system error. Burns one of the four sacred functional colors on noise. |
| Auto-generated narrative with cute fallback | [page.tsx:188-204](src/app/(app)/set/[id]/page.tsx#L188-L204) | Lovely when populated ("Ryan & Alyssa got this on Apr 12, 2024 for our anniversary") but ", for fun" reads as filler when no occasion exists. |

**Deterministic scan** (`npx impeccable detect`): clean. Zero JSX-level findings.

**Browser overlays**: skipped — no browser automation available in this environment.

## Overall Impression

Bones of the Display Shelf are here: sticky image well on desktop, neutral surface, narrative voice, calm composition. The page works as a **viewer**. It fails as a **maintainer's tool**. The single most frequent action a collector takes ("mark this as assembled") is buried behind a pencil → form → save → navigate sequence. The most-loud element on the page (when present) is a red banner about an internal job nobody asked about. The single biggest opportunity: **make the status badge a control, drop the red banner, and the detail page becomes a one-tap tool that still reads like a catalog page.**

## What's Working

- **Sticky image well on desktop** ([page.module.css:47-50](src/app/(app)/set/[id]/page.module.css#L47-L50)) — the photograph anchors the page while metadata is read. Pure Display Shelf doctrine.
- **The narrative sentence** when populated ([page.tsx:189-203](src/app/(app)/set/[id]/page.tsx#L189-L203)) — "Ryan & Alyssa got this on April 12, 2024 for our anniversary" carries the editorial voice DESIGN.md asks for. Unlike any AI-generated detail page.
- **Image skeleton + fade-in** ([page.module.css:60-83](src/app/(app)/set/[id]/page.module.css#L60-L83)) — protects the calm; image load doesn't pop into existence.

## Priority Issues

### [P0] Status is a label, not a control

- **Why it matters**: For a Maintainer ("I just finished building it, mark assembled"), the entire job on this page is changing one bit. Today: open set → tap pencil → tap status chip → tap Save → navigate back. Four interactions and a full-screen context switch for a one-bit change. The detail page he just landed on shows the current status as a badge but offers no way to change it. The page loses its primary verb.
- **Fix**: Make the status badge tappable. Open a small bottom sheet (Vaul drawer pattern already in the codebase) or a popover with the five status chips. Persist on selection, animate the badge color/label in place, fire a brief toast. Keep `/set/[id]/edit` for the long-tail fields (date, occasion, notes, owners).
- **Suggested command**: `craft` (or `shape` first if defining the interaction).

### [P0] The maintenance banner shouldn't be a system error

- **Why it matters**: [page.tsx:141-155](src/app/(app)/set/[id]/page.tsx#L141-L155) renders a red banner whenever `imageUrl && !customImageUrl`. To a Browser opening her husband's collection, the loudest thing on the page reads as "something is broken." It commandeers one of the four sacred functional colors for a non-error, draws the eye away from the photograph, and violates the peak-end rule.
- **Fix**: A failed background-removal job is not an error — it's a maintenance affordance. Move the retry behind a small neutral overflow on the image (or into the edit screen entirely). If it must stay on the page, render as a subtle neutral pill ("Reprocess image"), not a destructive-color block.
- **Suggested command**: `quieter`.

### [P1] Metadata pillbox row miscommunicates affordance

- **Why it matters**: Four `radius-full` neutral pills ([page.module.css:162-168](src/app/(app)/set/[id]/page.module.css#L162-L168)) for set #, pieces, year, theme are decorative chrome. Pills imply tappability (filter chips do tap). These don't. The grouping also flattens hierarchy: the **set number** is the most identifying piece of metadata for a collector (Brickset/BrickLink lookups) and deserves prominence; **theme** is rich navigation bait that should be a link; **pieces and year** are supporting prose.
- **Fix**: Set number as quiet `--text-tertiary` line under the title. "1,832 pieces · Released 2023" as a single Inter 14px metadata line. Theme as a real link ("Star Wars / Mandalorian →") to a filtered view in `/all`.
- **Suggested command**: `distill`.

### [P1] Visual hierarchy is a stack of containers, not a composition

- **Why it matters**: The right column stacks: banner (red surface) → name + status badge → naked stats row → story card (`surface-primary`, `radius-lg`) → notes card (`surface-primary`, `radius-lg`). Five different visual containers, three of them with their own surface treatment. Each block declares "I am important" by inventing its own container. The photograph — which DESIGN.md says should be the loudest object on screen — has to compete with two beige cards.
- **Fix**: Drop the story-card surface. Present the narrative as Instrument Serif at Title size (18px) in `--text-secondary`, no card. Drop the notes card too — replace with a small Headline rule ("Notes") and the prose underneath. Cards die, prose lives. The image regains its loudness through tonal hierarchy.
- **Suggested command**: `quieter` or `layout`.

### [P2] System inconsistencies: button shape, source-level serif weight

- **Why it matters**: The edit button is `radius-md` square ([page.module.css:14-28](src/app/(app)/set/[id]/page.module.css#L14-L28)) in a system whose distinctive signature is the capsule. The header back button matches. `.name` source declares `font-weight: var(--font-weight-bold)` ([page.module.css:146](src/app/(app)/set/[id]/page.module.css#L146)) which the Light-Serif Rule forbids — it only renders correctly because `[data-ui-theme='mono'] h1` (specificity 0,1,1) outweighs `.name` (0,1,0). A future refactor that touches the theme will surface the bug.
- **Fix**: Use the shared `btn-icon` capsule classes (from `src/styles/button.css`) for header buttons. Remove `font-weight` from `.name` and let the theme own it. Audit the page for the five different radii on screen and pick two (`md` for surface containers, `full` for pills, where pills earn their interactivity).
- **Suggested command**: `harden`.

### [P2] No lateral navigation — the page is a terminus

- **Why it matters**: A collector browsing the shelf hits back, scrolls home, finds the next set, taps. No prev/next on the detail page, no link on the theme breadcrumb. The "Display Shelf" metaphor breaks the moment you pick up a single piece — the rest of the shelf disappears.
- **Fix**: Add ambient prev/next at the bottom of the right column ("← Hogwarts Castle · Death Star →"). Make the theme breadcrumb a link to `/all?theme=...`. Optionally: View Transitions API (already in stack) for prev/next morphs, as the share-view page does on initial load.
- **Suggested command**: `adapt`.

### [P3] Mobile loses the Display heading size

- **Why it matters**: `.name` drops from `--font-size-3xl` (28px) to `--font-size-xl` (18px) on mobile ([page.module.css:297-299](src/app/(app)/set/[id]/page.module.css#L297-L299)). On a phone the photograph and the serif name are the entire page; shrinking the name flattens the editorial voice.
- **Fix**: Keep `.name` at `--font-size-3xl` on mobile. Accept that long set names wrap to two or three lines — that's editorial, not a defect.
- **Suggested command**: `typeset`.

## Persona Red Flags

**Maintainer (Ryan)** — *"I just finished building it, mark assembled. 10 seconds."*
Opens the set. Sees the status badge as a label. Has to find the pencil in the header, tap into a full edit form, find the status chip, tap it, scroll to Save, tap. Navigates back. **Four touches plus a screen change for a one-bit update.** The page he wanted to *see* turns into a form he has to *fill*. Worst part: nothing on the detail page suggests this is the path; the badge looks read-only because it is.

**Browser (Alyssa)** — *"What's that one called again? Show me the picture."*
Big photo on the left, name and narrative on the right. **This works.** The pillbox stats row is noise to her, the notes section is gold. One concern: the red "Processed image unavailable" banner — if present — is the loudest element on screen and reads as "something is broken with my husband's collection." She doesn't know what background removal is and shouldn't have to.

**Returning collector** — *"I want to compare this Falcon to my next Star Wars set."*
There's no next/prev, no link on `Star Wars / Mandalorian`. She has to: back → scroll → find → tap. **No exploration affordance.** The page is a terminus, not a node in a browse graph.

## Minor Observations

- **Edge-case bug** at [page.tsx:189-204](src/app/(app)/set/[id]/page.tsx#L189-L204): conditional cascade is `owners+date` → `owners-only` → `date-only` → `null`. A set with `occasion` but no `owners` and no `dateReceived` falls through to `null` — story card renders empty with only the "Built before" pill. The share-view counterpart handles this; the auth view doesn't. Drift already exists between the two.
- **Duplicate logic** between this and [`src/app/share/[shareToken]/set/[setId]/page.tsx`](src/app/share/[shareToken]/set/[setId]/page.tsx): ~90% of layout + the story-building logic. Extract a `SetDetailView` presentational component before more drift accumulates.
- **`#76989` set number** has no `aria-label`. Screen reader hears "pound 76989" — would benefit from `aria-label={\`Set number ${set.setNumber}\`}` (same pattern already used in `add-set/page.tsx`).
- **"No Image" placeholder** ([page.tsx:135](src/app/(app)/set/[id]/page.tsx#L135)) is plain text. At least put it in Instrument Serif Headline so the empty state holds the editorial tone.
- **"Background removal failed" toast** ([page.tsx:52-54](src/app/(app)/set/[id]/page.tsx#L52-L54)) offers no remediation path. If the underlying issue is a missing API key or quota, the user can't recover without leaving the app.

## Questions to Consider

1. **What if the status badge is the primary control?** A tappable capsule that opens an inline menu of five statuses, persists on tap, animates the badge color. The page becomes "look at this set; change its state in one tap." Edit shrinks to the long tail (date, notes, owners). Does the page need much else above the fold?

2. **What if there's no detail page — just a presentation mode of the card?** Tap a set in the grid; the card animates to fullscreen (View Transitions API is already in the stack). The detail view is the same card scaled up, with prev/next visible above and below as ghosted slivers. The Display Shelf becomes literal: you're holding a single piece off the shelf, the others are still in view.

3. **Does the auto-generated narrative sentence justify itself?** It's lovely when complete and awkward otherwise. What if the page just renders the four fields as a small definition list (`Owner · Date · Occasion`) in 13px Inter and skips the prose engine? Does the page get colder, or just quieter?

# Eggo - Lego Inventory Management

## Project Overview

Eggo is a web application for tracking Lego set collections. Built with Next.js and Supabase, it supports real-time sync and will eventually have an iOS companion app.

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript (strict mode)
- **UI Library**: React 19
- **Styling**: CSS Modules + CSS Custom Properties (no Tailwind)
- **Animations**: View Transitions API (native, used in add-set form)
- **Notifications**: Sonner (toast notifications)
- **Database**: Supabase Postgres (with RLS)
- **Authentication**: Supabase Auth (Google OAuth, PKCE flow)
- **Storage**: Supabase Storage (processed set images)
- **Testing**: Jest (unit), Playwright (E2E)
- **Components**: Storybook for isolated development
- **Deployment**: Netlify

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── (auth)/            # Auth routes (login)
│   ├── (app)/             # Protected app routes
│   ├── api/               # API routes (Brickset proxy, background removal)
│   ├── share/             # Public collection sharing routes
│   ├── layout.tsx
│   └── globals.css
├── components/            # React components
│   └── [Component]/
│       ├── Component.tsx
│       ├── Component.module.css
│       ├── Component.test.tsx
│       └── Component.stories.tsx
├── hooks/                 # Custom React hooks
├── lib/
│   ├── supabase/          # Supabase client, auth, data access, admin
│   ├── image/             # Image processing (background removal)
│   └── providers/         # External data providers (Brickset/Rebrickable)
├── styles/
│   ├── tokens.css         # Design tokens — Layer 1 primitives + Layer 2 aliases
│   └── theme.css          # Themed semantic variables (Layer 2)
└── types/                 # TypeScript type definitions

supabase/
└── migrations/            # SQL migrations (schema, RLS, realtime, storage)

scripts/                       # Top-level scripts (sibling of src/)
├── code-review.sh             # Code review helper script
├── refresh-all-images.mjs     # Batch re-fetch metadata + re-process images
└── verify-supabase-schema.mjs # Sanity-check tables, RLS, helpers
```

## Development Commands

```bash
npm run dev          # Start dev server
npm run build        # Production build
npm run lint         # Run ESLint
npm run lint:css     # Run stylelint (token discipline + CSS conventions)
npm run format       # Format with Prettier
npm run typecheck    # TypeScript type checking
npm run test         # Run Jest tests
npm run test:watch   # Jest in watch mode
npm run e2e          # Run Playwright tests
npm run storybook    # Start Storybook
```

## Code Style Guidelines

### TypeScript

- Use strict mode (`strict: true` in tsconfig)
- Prefer `interface` over `type` for object shapes
- Export types from dedicated type files, not inline
- Use explicit return types for functions

### CSS & Design System

- Use CSS Modules for component styles
- Use semantic CSS variables from `theme.css` (e.g., `var(--text-primary)`)
- Never use hard-coded colors - always reference tokens or semantic variables
- Keep specificity low - prefer class selectors
- Use design tokens from `tokens.css` (Layer 1 primitives) and `theme.css` (Layer 2 semantic aliases). Token discipline is enforced by stylelint (`npm run lint:css`) and runs automatically on pre-commit.
- **Three-layer token architecture:**
  - Layer 1 (primitives): Raw values in `tokens.css` (e.g., `--color-gray-500`, `--space-4`)
  - Layer 2 (semantic aliases): Project-level references in `tokens.css` and `theme.css` (e.g., `--text-primary`, `--surface-background`)
  - Layer 3 (components): CSS Modules that consume Layer 2 aliases for themed values. Scale tokens (`--space-*`, `--font-size-*`, `--radius-*`, etc.) may be used directly since they don't change with theme.
- **Token rules — no hardcoded raw values in components:**
  - Colors: use Layer 2 semantic tokens (`--text-*`, `--surface-*`, `--border-*`, `--interactive-*`, `--status-*`) — never use hex/rgb directly
  - Spacing: use `--space-*` scale tokens for padding, margin, gap
  - Typography: use `--font-size-*`, `--font-weight-*`, `--line-height-*`, `--letter-spacing-*` scale tokens
  - Border radius: use `--radius-*` scale tokens
  - Shadows: use `--shadow-*` tokens
  - Z-index: use `--z-*` tokens
  - Opacity: use `--opacity-*` tokens
  - Motion: use `--duration-*`, `--transition-*`, `--ease-*` tokens
  - Sizing: use `--size-*`, `--layout-*`, `--max-width-*`, `--min-width-*` tokens
- **Stylelint**: `npm run lint:css` enforces the token rules above plus CSS error-checking (duplicate properties, empty blocks, etc.). Config in `.stylelintrc.json`. Token-definition files (`tokens.css`, `theme.css`) are exempted from token-discipline rules. Use `/* stylelint-disable-next-line <rule> -- reason */` for legitimate exceptions.
- **Stylelint blind spot — string-encoded values**: stylelint parses CSS declarations and can't see colors embedded inside string-encoded data URIs (e.g., `stroke='%23737373'` inside `background-image: url("data:image/svg+xml,...")`). For SVG icons that need to follow theme, use `mask-image` plus `background-color: var(--text-*)` so the color comes from a theme-aware token instead of being baked into the SVG.

### Components

- One component per file
- Co-locate styles, tests, and stories with the component
- Use named exports (not default)
- Props interfaces should be named `[Component]Props`

### Testing

- Unit tests go next to the component: `Component.test.tsx`
- E2E tests go in `/e2e` directory
- Write tests for business logic and user interactions
- Don't test implementation details

## Versioning

Version is managed automatically. A GitHub Action bumps `package.json` version on every merge to `main` based on commit message prefixes:

- `feat:` → **minor** bump (0.11.2 → 0.12.0)
- `fix:` → **patch** bump (0.11.2 → 0.11.3)
- any `<type>!:` (e.g., `feat!:`, `fix!:`, `refactor!:`) or `BREAKING CHANGE` → **major** bump (0.11.2 → 1.0.0)
- Anything else (`chore:`, `docs:`, `refactor:`, `deps:`) → no bump

Major version bumps should only happen for changes that break backwards compatibility — e.g., a completely new data model, removing/renaming public API routes, or changes that would break the iOS companion app. Most work on this project will be `feat:` or `fix:`.

The version is injected at build time via `next.config.ts` and displayed in Settings > About. Never update the version in `package.json` manually.

### Commit message format

Use [Conventional Commits](https://www.conventionalcommits.org/) prefixes:

```
feat: add new lego set search        # new feature → minor bump
fix: correct sort order for themes   # bug fix → patch bump
feat!: redesign data model           # breaking change → major bump
chore: update dependencies           # maintenance → no bump
docs: update API documentation       # documentation → no bump
refactor: simplify auth flow         # refactoring → no bump
```

## AI Development Guidelines

### DO

- Always run `npm run typecheck` after making changes
- Run `npm run lint` before committing
- Use conventional commit prefixes (`feat:`, `fix:`, `chore:`, etc.) — version bumps depend on this
- Write tests for new functionality
- Use existing patterns from the codebase
- Keep changes focused and minimal
- Check for and remove any debug code before committing

### DON'T

- Don't leave placeholder code (TODO, FIXME, "implement later")
- Don't add features beyond what was requested
- Don't introduce new dependencies without discussion
- Don't skip error handling
- Don't create overly abstract code for simple problems
- Don't add comments that just restate the code

### Common Pitfalls to Avoid

1. **Over-engineering**: Don't create utilities/helpers for one-time operations
2. **Incomplete implementations**: Every function should be fully working
3. **Magic strings**: Use constants or enums for repeated string values
4. **Missing error states**: Handle loading, error, and empty states in UI
5. **Hardcoded values**: Use environment variables for configuration

## Data Model

### Collections

Groups of Lego sets (e.g., "The Graves Collection")

- `owners`: Simple string tags like "Ryan", "Alyssa"
- `memberUserIds`: Supabase auth user IDs (UUIDs) — modeled as a `collection_members` join table; `is_collection_member()` SECURITY DEFINER helper resolves membership for RLS without recursion
- `isPublic`: (optional) Whether collection is publicly viewable via share link
- `publicShareToken`: (optional) Unique 12-character token for public share URL
- `publicViewSettings`: (optional) Object controlling which fields are visible publicly:
  - `showOwner`: Show owner names
  - `showDateReceived`: Show date received
  - `showOccasion`: Show occasion
  - `showNotes`: Show notes

### Sets

Individual Lego sets with:

- Core data: `setNumber`, `name`, `pieceCount`, `year`
- Theme hierarchy: `theme`, `subtheme` (from Brickset/Rebrickable)
- User data: `status`, `owner`, `occasion`, `dateReceived`
- Status values: `unopened`, `in_progress`, `rebuild_in_progress`, `assembled`, `disassembled`

### Users

Application users with:

- Color mode preference: `system`, `light`, `dark`
- UI theme preference: `mono` (minimal serif), `baseplate` (classic accent colors)
- Collection memberships

## External APIs

### Brickset (Primary)

Used for set metadata (piece count, themes, images). Better data coverage than Rebrickable.

- API docs: https://brickset.com/article/52664/api-version-3-documentation
- Get API key: https://brickset.com/tools/webservices/requestkey
- Set numbers: Use format "12345-1" (with suffix), auto-added if missing

### Rebrickable (Fallback)

Used as fallback if Brickset API key is not configured.

- API docs: https://rebrickable.com/api/
- Rate limits: Be mindful of request frequency
- Set numbers: Use format "12345-1" (with suffix)

## Deployment

Hosted on Netlify with the `@netlify/plugin-nextjs` plugin for full Next.js support.

### Netlify Setup

1. Connect your GitHub repository to Netlify
2. Build settings are configured in `netlify.toml` (no manual config needed)
3. Add environment variables in Netlify dashboard:
   - Site Settings > Environment Variables
   - Add all variables from `.env.local.example`

### Required Environment Variables

| Variable | Description | Where to get it |
|----------|-------------|-----------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | Supabase Dashboard > Project Settings > API Keys |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Browser-safe key (subject to RLS), `sb_publishable_…` | Supabase Dashboard > Project Settings > API Keys |
| `SUPABASE_SECRET_KEY` | Server-only key that bypasses RLS, `sb_secret_…` — never expose to the browser | Supabase Dashboard > Project Settings > API Keys |
| `BRICKSET_API_KEY` | Brickset API key (recommended, server-only) | https://brickset.com/tools/webservices/requestkey |
| `NEXT_PUBLIC_REBRICKABLE_API_KEY` | Rebrickable API key (fallback) | https://rebrickable.com/api/ |
| `REMBG_API_KEY` | rembg.com API key for background removal | https://www.rembg.com |

### Supabase Setup for Production

1. In the Supabase Dashboard, configure the Google OAuth provider:
   - Authentication > Providers > Google
   - Add your Google client ID/secret and the Netlify redirect URL (`https://your-site.netlify.app/auth/callback`)
2. Add your site URL and any deploy-preview URLs under Authentication > URL Configuration
3. Run the SQL migrations in `supabase/migrations/` against the project (in order)
4. Verify RLS, helpers, and tables with `node scripts/verify-supabase-schema.mjs`

### Schema, RLS, and Realtime

Schema lives in `supabase/migrations/`:

- `0001_init.sql` — tables (`collections`, `collection_members`, `sets`, `user_preferences`), enums, the `is_collection_member()` SECURITY DEFINER helper, and full RLS policies. Also created the temporary `_firebase_uid_map` and claim trigger used during the Firestore cutover.
- `0002_realtime_and_storage.sql` — adds tables to the `supabase_realtime` publication and creates the `processed-images` storage bucket (5 MB limit, public read)
- `0003_drop_claim_flow.sql` — drops the temporary claim infrastructure once all returning users have signed in. Adds the `replace_collection_members()` RPC for atomic membership replacement.

RLS policy summary:

- `collections` — members can read/write; anyone can read rows where `is_public = true`
- `collection_members` — members of the same collection can read; the API route inserts via the secret-key client during creation
- `sets` — members of the parent collection can read/write; public read when the parent collection is public
- `user_preferences` — only the owning user (`auth.uid() = user_id`)

The browser uses the publishable key and is fully constrained by RLS. The two server routes that need to bypass RLS (`/api/collections` for member insert during create, `/api/remove-background` for Storage uploads) use `getAdminClient()` with `SUPABASE_SECRET_KEY` and verify the caller's JWT explicitly.

Realtime is wired via `postgres_changes` channels in the data hooks — subscriptions trigger a refetch rather than patching local state.

## Getting Started

1. Copy `.env.local.example` to `.env.local`
2. Fill in Supabase, Brickset, and rembg.com API credentials
3. Run `npm install`
4. Run `npm run dev`

## Questions?

If something is unclear in this codebase, ask rather than guess.

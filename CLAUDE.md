# Eggo - Lego Inventory Management

## Project Overview

Eggo is a web application for tracking Lego set collections. Built with Next.js and Firebase, it supports real-time sync and will eventually have an iOS companion app.

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript (strict mode)
- **UI Library**: React 19
- **Styling**: CSS Modules + CSS Custom Properties (no Tailwind)
- **Animations**: View Transitions API (via next-view-transitions)
- **Notifications**: Sonner (toast notifications)
- **Database**: Firebase Firestore
- **Authentication**: Firebase Auth (Google Sign-In)
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
│   ├── firebase/          # Firebase configuration
│   ├── image/             # Image processing (background removal)
│   └── providers/         # External data providers (Brickset/Rebrickable)
├── styles/
│   ├── tokens.css         # Design tokens (colors, spacing, etc.)
│   └── theme.css          # Semantic theme variables
└── types/                 # TypeScript type definitions
```

## Development Commands

```bash
npm run dev          # Start dev server
npm run build        # Production build
npm run lint         # Run ESLint
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

### CSS

- Use CSS Modules for component styles
- Use semantic CSS variables from `theme.css` (e.g., `var(--text-primary)`)
- Never use hard-coded colors - always reference tokens or semantic variables
- Keep specificity low - prefer class selectors

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

## AI Development Guidelines

### DO

- Always run `npm run typecheck` after making changes
- Run `npm run lint` before committing
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
- `memberUserIds`: Firebase user IDs who can access
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
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Firebase Web API key | Firebase Console > Project Settings |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Firebase Auth domain | Firebase Console > Project Settings |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Firebase project ID | Firebase Console > Project Settings |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | Firebase storage bucket | Firebase Console > Project Settings |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Firebase sender ID | Firebase Console > Project Settings |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Firebase app ID | Firebase Console > Project Settings |
| `BRICKSET_API_KEY` | Brickset API key (recommended, server-only) | https://brickset.com/tools/webservices/requestkey |
| `NEXT_PUBLIC_REBRICKABLE_API_KEY` | Rebrickable API key (fallback) | https://rebrickable.com/api/ |
| `REMBG_API_KEY` | rembg.com API key for background removal (optional, free) | https://www.rembg.com |

### Firebase Setup for Production

1. In Firebase Console, add your Netlify domain to authorized domains:
   - Authentication > Settings > Authorized domains
   - Add: `your-site.netlify.app` and custom domain if applicable
2. Update Firestore security rules for production use (see below)
3. Create required Firestore indexes (see below)

### Firestore Composite Index (Required for Public Sharing)

The public collection sharing feature requires a composite index. Create it in Firebase Console:

1. Go to Firestore Database > Indexes > Composite
2. Create an index on the `collections` collection:
   - Field 1: `publicShareToken` (Ascending)
   - Field 2: `isPublic` (Ascending)
   - Query scope: Collection

Alternatively, Firestore will provide a link to auto-create the index when the query first fails.

### Firestore Security Rules (Required for Public Sharing)

Update your Firestore security rules to allow public access to shared collections:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Collections - members can read/write, public can read if isPublic
    // Note: create uses request.resource.data (incoming), update/delete use resource.data (existing)
    match /collections/{collectionId} {
      allow read: if request.auth != null && request.auth.uid in resource.data.memberUserIds;
      allow read: if resource.data.isPublic == true;
      allow create: if request.auth != null && request.auth.uid in request.resource.data.memberUserIds;
      allow update, delete: if request.auth != null && request.auth.uid in resource.data.memberUserIds;
    }

    // Sets - members can read/write, public can read if parent collection is public
    // Note: create uses request.resource.data (incoming), update/delete use resource.data (existing)
    match /sets/{setId} {
      allow create: if request.auth != null &&
        request.auth.uid in get(/databases/$(database)/documents/collections/$(request.resource.data.collectionId)).data.memberUserIds;
      allow read, update, delete: if request.auth != null &&
        request.auth.uid in get(/databases/$(database)/documents/collections/$(resource.data.collectionId)).data.memberUserIds;
      allow read: if get(/databases/$(database)/documents/collections/$(resource.data.collectionId)).data.isPublic == true;
    }

    // Users - only the user themselves can read/write
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

**Important**: Test these rules in the Firebase Console Rules Playground before deploying to production.

## Getting Started

1. Copy `.env.local.example` to `.env.local`
2. Fill in Firebase and Brickset API credentials
3. Run `npm install`
4. Run `npm run dev`

## Questions?

If something is unclear in this codebase, ask rather than guess.

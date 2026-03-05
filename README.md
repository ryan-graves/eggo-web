# Eggo

A web application for managing your Lego set collection. Track what you own, when and why you got each set, its current status, and more.

## Features

- Track Lego sets with set number, name, piece count, themes, and more
- Auto-populate set data from Brickset (primary) or Rebrickable (fallback)
- Organize by owner, status, and theme
- Real-time sync across devices
- Public collection sharing with customizable visibility settings
- Light/dark color modes with system preference support
- UI themes: Mono (minimal serif) and Baseplate (classic accent colors)
- Optional background removal for set images (via rembg.com)
- Smooth view transitions between pages

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript (strict mode)
- **UI Library**: React 19
- **Database**: Firebase Firestore
- **Authentication**: Firebase Auth (Google Sign-In)
- **Styling**: CSS Modules + CSS Custom Properties (design tokens)
- **Animations**: View Transitions API (via next-view-transitions)
- **Notifications**: Sonner (toast notifications)
- **Testing**: Jest 30 (unit), Playwright (E2E)
- **Components**: Storybook 10
- **Deployment**: Netlify

## Getting Started

### Prerequisites

- Node.js 18+
- A Firebase project
- Brickset API key (recommended) or Rebrickable API key (fallback)

### Setup

1. Clone the repository

2. Install dependencies:

   ```bash
   npm install
   ```

3. Copy the environment template:

   ```bash
   cp .env.local.example .env.local
   ```

4. Fill in your Firebase and Brickset/Rebrickable credentials in `.env.local`

5. Start the development server:

   ```bash
   npm run dev
   ```

6. Open http://localhost:3000

## Development

```bash
npm run dev          # Start dev server
npm run build        # Production build
npm run lint         # Run ESLint
npm run format       # Format with Prettier
npm run typecheck    # TypeScript type checking
npm run test         # Run Jest tests
npm run e2e          # Run Playwright tests
npm run storybook    # Start Storybook
npm run review       # Run code quality checks
```

## Versioning

This project uses [Conventional Commits](https://www.conventionalcommits.org/) and automated version bumping. A GitHub Action runs on every merge to `main` and bumps the version in `package.json` based on the commit message prefix:

| Prefix | Bump | Example |
|--------|------|---------|
| `feat:` | Minor (0.11.2 → 0.12.0) | `feat: add set search` |
| `fix:` | Patch (0.11.2 → 0.11.3) | `fix: correct sort order` |
| `<type>!:` | Major (0.11.2 → 1.0.0) | `feat!: redesign data model`, `fix!: change error codes` |
| `chore:`, `docs:`, `refactor:`, `deps:` | None | `chore: update dependencies` |

The version is displayed in Settings > About and varies by environment:
- **Production** (Netlify): `0.12.0`
- **Branch deploy** (Netlify): `0.12.0-dev.abc1234`
- **Local dev**: `0.12.0-local`

No manual version management is needed — just use the right commit prefix.

## Deployment

This app is configured for deployment on Netlify. See the Netlify dashboard for configuration.

## License

Private project - not for redistribution.

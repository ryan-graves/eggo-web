# Eggo

Track your Lego set collection — what you own, when and why you got each set, and its build status.

**Live at [eggo.fun](https://eggo.fun)**

## Features

- Auto-populate set data (piece count, themes, images) from Brickset or Rebrickable
- Organize by owner, status, and theme
- Real-time sync across devices
- Public collection sharing with customizable visibility
- Light/dark modes, multiple UI themes, and automatic background removal for set images

## Tech Stack

Next.js 16 (App Router) · React 19 · TypeScript · Supabase (Postgres, Auth, Storage) · CSS Modules with design tokens · Jest + Playwright · Netlify

## Getting Started

Requires Node.js 20.19+, a Supabase project, and API keys for Brickset (or Rebrickable) and rembg.com.

```bash
npm install
cp .env.local.example .env.local   # fill in credentials
npm run dev
```

Then open http://localhost:3000.

Useful scripts: `npm run lint`, `npm run typecheck`, `npm run test`, `npm run e2e`, `npm run storybook`.

## License

Private project — not for redistribution.

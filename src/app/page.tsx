'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import type { LegoSet, SetStatus } from '@/types';
import styles from './page.module.css';

const STATUS_LABELS: Record<SetStatus, string> = {
  unopened: 'Unopened',
  in_progress: 'In Progress',
  rebuild_in_progress: 'Rebuilding',
  assembled: 'Assembled',
  disassembled: 'Disassembled',
};

const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION ?? '';

/**
 * Compact factory for marketing demo sets. Fills in the boilerplate
 * `LegoSet` fields (ids, dates, dataSource, etc.) so the HERO_SETS array
 * below stays readable as a list of "set + theme + status + owner."
 */
function demoSet(
  setNumber: string,
  name: string,
  theme: string,
  pieceCount: number,
  year: number,
  status: SetStatus,
  owner: string
): LegoSet {
  return {
    id: `demo-${setNumber}`,
    collectionId: 'demo',
    setNumber,
    name,
    pieceCount,
    year,
    theme,
    subtheme: null,
    imageUrl: null,
    customImageUrl: `/marketing/sets/${setNumber}-1.png`,
    status,
    hasBeenAssembled: status === 'assembled' || status === 'in_progress',
    dateReceived: null,
    owners: [owner],
    dataSource: 'brickset',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  };
}

/**
 * Marketing-only demo sets shown in the hero catalog mockup. Rendered
 * through `MarketingSetTile` (defined below) at native thumbnail size
 * so the catalog grid stays editorial without leaning on the real
 * SetCard's app-scale tokens.
 *
 * 24 sets in a 6×4 grid — the even column count is intentional: it
 * puts the grid's horizontal midpoint between columns 3 and 4, so
 * `justify-content: center` produces a layout with no single tile
 * centered on mobile (a left-center and right-center column instead),
 * which reads as more catalog-like than a centered-single-column hero.
 *
 * Owners are placeholder names (not real users). Status mix skews toward
 * built (~70%) so the catalog reads as a lived-in collection. Themes
 * deliberately mixed (Icons, Ideas, Technic, Star Wars).
 *
 * Stop-gap until a proper public demo collection lives in Supabase
 * (tracked at https://github.com/ryan-graves/eggo-web/issues/56).
 */
const HERO_SETS: LegoSet[] = [
  demoSet('75192', 'UCS Millennium Falcon', 'Star Wars', 7541, 2017, 'assembled', 'Mae'),
  demoSet('10281', 'Bonsai Tree', 'Icons', 878, 2021, 'assembled', 'Jules'),
  demoSet('10307', 'Eiffel Tower', 'Icons', 10001, 2022, 'in_progress', 'Theo'),
  demoSet('10276', 'Colosseum', 'Icons', 9036, 2020, 'assembled', 'Mae'),
  demoSet('10294', 'Titanic', 'Icons', 9090, 2021, 'in_progress', 'Sam'),
  demoSet('10311', 'Orchid', 'Icons', 608, 2022, 'assembled', 'Nora'),
  demoSet('10328', 'Bouquet of Roses', 'Icons', 822, 2024, 'assembled', 'Jules'),
  demoSet('10312', 'Jazz Club', 'Icons', 2899, 2023, 'in_progress', 'Theo'),
  demoSet('10316', 'The Lord of the Rings: Rivendell', 'Icons', 6167, 2023, 'unopened', 'Mae'),
  demoSet('21318', 'Tree House', 'Ideas', 3036, 2019, 'assembled', 'Sam'),
  demoSet('21319', 'Central Perk', 'Ideas', 1070, 2019, 'assembled', 'Nora'),
  demoSet('21321', 'International Space Station', 'Ideas', 864, 2020, 'assembled', 'Theo'),
  demoSet('21336', 'The Office', 'Ideas', 1164, 2022, 'assembled', 'Mae'),
  demoSet('21338', 'A-Frame Cabin', 'Ideas', 2082, 2023, 'unopened', 'Jules'),
  demoSet('21343', 'Viking Village', 'Ideas', 2103, 2023, 'in_progress', 'Sam'),
  demoSet('42083', 'Bugatti Chiron', 'Technic', 3599, 2018, 'assembled', 'Theo'),
  demoSet('42115', 'Lamborghini Sián FKP 37', 'Technic', 3696, 2020, 'assembled', 'Mae'),
  demoSet('40531', 'Lars Family Homestead Kitchen', 'Star Wars', 195, 2022, 'assembled', 'Nora'),
  demoSet('30495', 'AT-ST', 'Star Wars', 79, 2021, 'unopened', 'Jules'),
  demoSet('75312', "Boba Fett's Starship", 'Star Wars', 593, 2021, 'unopened', 'Sam'),
  demoSet('10283', 'NASA Space Shuttle Discovery', 'Icons', 2354, 2021, 'assembled', 'Theo'),
  demoSet('10314', 'Dried Flower Centerpiece', 'Icons', 812, 2023, 'assembled', 'Nora'),
  demoSet('21344', 'The Orient Express Train', 'Ideas', 2540, 2023, 'in_progress', 'Jules'),
  demoSet('10302', 'Optimus Prime', 'Icons', 1508, 2022, 'assembled', 'Sam'),
];

/**
 * Three feature blocks shown beneath the hero. Pure typography — the
 * catalog mockup in the hero carries the visual weight, so the features
 * stay quiet and text-led.
 */
const FEATURES = [
  {
    heading: 'Add your collection quickly and easily.',
    body: 'Type a set’s number and Eggo fills in the rest: name, theme, piece count, year, and a clean image of the set.',
  },
  {
    heading: 'Remember when and how you got it.',
    body: 'Note when each set arrived, the occasion, who gave it to you. Eggo keeps that history alongside the piece count.',
  },
  {
    heading: 'Search, filter, share.',
    body: 'Filter by theme, owner, or build status. Get a customizable public link so you can share your collection with friends and family.',
  },
] as const;

/**
 * Public landing page at `/`. Two-column hero (text-left, decorative
 * catalog mockup right) at desktop, stacked on mobile. The hero is
 * sized to ~80vh on desktop so the features section peeks above the
 * fold and visitors know there's more to scroll to. A 3-column features
 * block and a quiet footer follow. Signed-in visitors get a silent
 * redirect to /home once the client confirms their session.
 *
 * SSR renders the marketing HTML unconditionally (no flash for unsigned,
 * full SEO surface). The brief flash for already-signed-in returning
 * users is an acceptable trade for keeping the page statically prerendered.
 */
export default function HomePage(): React.JSX.Element {
  const { user, loading, error: contextError, signInWithGoogle } = useAuth();
  const router = useRouter();

  // Two error sources both end up next to the CTA:
  //   1. `contextError` — failures from the in-page signInWithGoogle call
  //      (e.g. Supabase rejects the redirect request).
  //   2. `?error=` query param — set by /auth/callback when the provider
  //      returns an OAuth error and bounces back to /. Without surfacing
  //      it here that message would silently disappear after the redirect.
  // contextError wins when both are present (it's the more recent signal).
  // Read on the client only (via useEffect) rather than next/navigation's
  // useSearchParams, since that requires a Suspense boundary to allow
  // the rest of this page to statically prerender.
  const [urlError, setUrlError] = useState<string | null>(null);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-shot client-only read of the OAuth error param
    setUrlError(params.get('error'));
  }, []);
  const ctaError = contextError ?? urlError;

  // OAuth handler kicked off from the landing CTA. signInWithGoogle does
  // the Supabase redirect; on return the useEffect below routes to /home.
  // The inline catch only suppresses the unhandled-promise warning; the
  // actual error is set on `contextError` by the auth provider.
  const handleSignIn = async (): Promise<void> => {
    try {
      await signInWithGoogle();
    } catch {
      // captured by auth context
    }
  };

  const ctaReady = !loading && !user;

  // State starts as HERO_SETS in declared order so SSR + first hydration
  // render match (no React hydration mismatch). Then a useEffect shuffles
  // once on mount so each visit gets a fresh-feeling catalog.
  const [heroSets, setHeroSets] = useState<LegoSet[]>(HERO_SETS);

  useEffect(() => {
    if (!loading && user) {
      router.replace('/home');
    }
  }, [user, loading, router]);

  useEffect(() => {
    // Fisher–Yates shuffle, in-place on a fresh copy. Math.random isn't
    // SSR-safe (server and client would diverge and warn on hydrate), so
    // the shuffle runs on the client after first paint. Matches the
    // localStorage-hydration pattern in useUserPreferences.
    const next = [...HERO_SETS];
    for (let i = next.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [next[i], next[j]] = [next[j], next[i]];
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-shot client-only seed
    setHeroSets(next);
  }, []);

  return (
    <div className={styles.page}>
      <main className={styles.hero}>
        <div className={styles.heroText}>
          <p className={styles.wordmark}>Eggo</p>
          <h1 className={styles.tagline}>A catalog for your Lego collection.</h1>
          <p className={styles.prose}>
            Easily add and track your sets, with the story behind each one.
          </p>
          <button
            type="button"
            onClick={handleSignIn}
            className={styles.cta}
            disabled={!ctaReady}
          >
            <GoogleIcon />
            {ctaReady ? 'Get started with Google' : user ? 'Redirecting…' : 'Loading…'}
          </button>
          {ctaError && (
            <p className={styles.ctaError} role="alert">
              {ctaError}
            </p>
          )}
        </div>

        {/* Decorative catalog mockup. Uses MarketingSetTile (defined
            below) rather than the real SetCard because the real card's
            internals (paddings, text sizes, badge sizes) don't compose
            well at small widths — text wraps to many lines, making
            tiles tall and skinny. MarketingSetTile is sized natively
            for the catalog-preview use case. aria-hidden +
            pointer-events:none (in CSS) keeps it presentational. */}
        <div className={styles.heroCatalog} aria-hidden="true">
          <div className={styles.heroCatalogGrid}>
            {heroSets.map((set) => (
              <MarketingSetTile key={set.id} set={set} />
            ))}
          </div>
        </div>
      </main>

      <section className={styles.features} aria-label="What Eggo does">
        {FEATURES.map((feature) => (
          <article key={feature.heading} className={styles.feature}>
            <h2 className={styles.featureHeading}>{feature.heading}</h2>
            <p className={styles.featureBody}>{feature.body}</p>
          </article>
        ))}
      </section>

      <footer className={styles.footer}>
        <p className={styles.footerWordmark}>Eggo</p>
        <p className={styles.footerCredit}>
          A small project by Ryan Graves · ©{' '}
          {/* Suppress hydration warning on just the year: if the build
              crosses Dec 31 → Jan 1 (or the server/client disagree for
              any other reason) the strings differ by 4 characters with
              no layout impact, and we'd rather not warn over it. */}
          <span suppressHydrationWarning>{new Date().getFullYear()}</span>
          {APP_VERSION ? ` · v${APP_VERSION}` : ''}
        </p>
      </footer>
    </div>
  );
}

/**
 * Multi-color Google "G" mark for the OAuth CTA. Same SVG used on
 * the sign-in page; kept inline here so the landing page stays
 * self-contained. If a third use case appears, lift to a shared
 * `components/GoogleIcon/` per the project's component pattern.
 */
function GoogleIcon(): React.JSX.Element {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path
        d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"
        fill="#4285F4"
      />
      <path
        d="M9.003 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.96v2.332A8.997 8.997 0 0 0 9.003 18z"
        fill="#34A853"
      />
      <path
        d="M3.964 10.712A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.96A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.96 4.042l3.004-2.33z"
        fill="#FBBC05"
      />
      <path
        d="M9.003 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.464.891 11.428 0 9.002 0A8.997 8.997 0 0 0 .96 4.958l3.004 2.332c.708-2.127 2.692-3.71 5.036-3.71z"
        fill="#EA4335"
      />
    </svg>
  );
}

/**
 * Marketing-only set tile. Mirrors the live SetCard's information
 * architecture (image well on top, name + number + meta + details
 * underneath) but with everything natively sized for thumbnail use —
 * smaller paddings, smaller radius, smaller fonts, more aggressive
 * line-clamping. SetCard's real sizes don't shrink proportionally
 * because they reference fixed --space-/--font-size- tokens, so the
 * card gets tall and skinny when forced narrow. This tile is
 * presentational only (no link, no hooks) so it's safe to render in
 * the public hero without the navigation machinery SetCard carries.
 *
 * Pairs the local `tileBadge` style (sizing) with the global
 * `status-{state}` color class so status colors stay in sync with the
 * rest of the app.
 */
function MarketingSetTile({ set }: { set: LegoSet }): React.JSX.Element {
  const imageUrl = set.customImageUrl ?? set.imageUrl;
  return (
    <div className={styles.tile}>
      <div className={styles.tileImage}>
        <div className={styles.tileImageInner}>
          {imageUrl && (
            <Image src={imageUrl} alt="" fill sizes="140px" style={{ objectFit: 'contain' }} />
          )}
        </div>
      </div>
      <div className={styles.tileContent}>
        <p className={styles.tileName}>{set.name}</p>
        <p className={styles.tileNumber}>
          #{set.setNumber}
          {set.pieceCount != null && ` • ${set.pieceCount.toLocaleString()} pcs`}
        </p>
        {set.theme && <p className={styles.tileTheme}>{set.theme}</p>}
        <div className={styles.tileMeta}>
          <span className={`${styles.tileBadge} status-${set.status}`}>
            {STATUS_LABELS[set.status]}
          </span>
          {set.owners[0] && <span className={styles.tileOwner}>{set.owners[0]}</span>}
        </div>
      </div>
    </div>
  );
}

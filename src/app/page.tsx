'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
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
 * Marketing-only demo sets shown in the hero catalog mockup. Pulled
 * through the real `SetCard` component so the grid stays in lockstep with
 * how the actual catalog looks (theming, layout, hover).
 *
 * Owners are placeholder names (not real users). Status mix skews toward
 * built (~70%) so the catalog reads as a lived-in collection. Themes are
 * deliberately mixed (Icons, Ideas, Technic, Star Wars, Botanical).
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
];

/**
 * Three feature blocks shown beneath the hero. Pure typography — the
 * catalog mockup in the hero carries the visual weight, so the features
 * stay quiet and text-led.
 */
const FEATURES = [
  {
    heading: 'Type a number, get a set.',
    body: 'Brickset has every set’s photo, theme, and piece count. Enter the number and Eggo pulls the rest in.',
  },
  {
    heading: 'Remember when and how you got it.',
    body: 'Note the date a set arrived, the occasion, who gave it to you. Each set carries that history alongside the brick count.',
  },
  {
    heading: 'Search, filter, share.',
    body: 'Filter by theme, owner, or build status. Send someone a public link to your collection; they don’t need to sign up to look.',
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
  const { user, loading } = useAuth();
  const router = useRouter();

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
          <Link href="/sign-in" className={styles.cta}>
            Sign in with Google
          </Link>
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
        <p className={styles.footerLine}>Built by Ryan{APP_VERSION ? ` · v${APP_VERSION}` : ''}</p>
      </footer>
    </div>
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
        <p className={styles.tileNumber}>#{set.setNumber}</p>
        <div className={styles.tileMeta}>
          <span className={`${styles.tileBadge} status-${set.status}`}>
            {STATUS_LABELS[set.status]}
          </span>
          {set.owners[0] && <span className={styles.tileOwner}>{set.owners[0]}</span>}
        </div>
        <div className={styles.tileDetails}>
          {set.pieceCount != null && <span>{set.pieceCount} pcs</span>}
          {set.theme && <span>{set.theme}</span>}
        </div>
      </div>
    </div>
  );
}

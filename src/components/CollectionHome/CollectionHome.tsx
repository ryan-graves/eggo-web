'use client';

import { useMemo } from 'react';
import type { Timestamp } from 'firebase/firestore';
import { SetCarousel } from '@/components/SetCarousel';
import type { LegoSet } from '@/types';
import styles from './CollectionHome.module.css';

/**
 * Safely convert a dateReceived value to a sortable string.
 * Handles both string (YYYY-MM-DD) and legacy Firestore Timestamp formats.
 */
function getDateString(dateReceived: string | Timestamp | null | undefined): string {
  if (!dateReceived) return '';
  if (typeof dateReceived === 'string') return dateReceived;
  // Handle Firestore Timestamp objects
  if (typeof dateReceived === 'object' && 'toDate' in dateReceived) {
    const date = dateReceived.toDate();
    return date.toISOString().split('T')[0]; // Returns YYYY-MM-DD
  }
  return '';
}

interface CollectionHomeProps {
  sets: LegoSet[];
}

// Shuffle array using Fisher-Yates algorithm
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// Section definitions with their logic
interface Section {
  id: string;
  title: string;
  getSets: (sets: LegoSet[]) => LegoSet[];
  emptyMessage: string;
  viewAllFilter?: string;
}

const SECTIONS: Section[] = [
  {
    id: 'in_progress',
    title: 'In Progress',
    getSets: (sets) =>
      sets.filter((s) => s.status === 'in_progress' || s.status === 'rebuild_in_progress'),
    emptyMessage: 'No builds in progress',
    viewAllFilter: 'status=in_progress',
  },
  {
    id: 'discover',
    title: 'Discover Something New',
    getSets: (sets) =>
      shuffleArray(sets.filter((s) => s.status === 'unopened' || s.status === 'disassembled')),
    emptyMessage: 'All sets have been built!',
  },
  {
    id: 'recently_added',
    title: 'Recently Added',
    getSets: (sets) =>
      [...sets]
        .filter((s) => s.dateReceived)
        .sort((a, b) => {
          // Use helper to handle both string and legacy Timestamp formats
          const dateA = getDateString(a.dateReceived);
          const dateB = getDateString(b.dateReceived);
          return dateB.localeCompare(dateA);
        }),
    emptyMessage: 'No sets with dates yet',
  },
  {
    id: 'star_wars',
    title: 'Star Wars',
    getSets: (sets) => sets.filter((s) => s.theme?.toLowerCase().includes('star wars')),
    emptyMessage: 'No Star Wars sets',
    viewAllFilter: 'theme=Star%20Wars',
  },
  {
    id: 'largest',
    title: 'Biggest Builds',
    getSets: (sets) =>
      [...sets].filter((s) => s.pieceCount).sort((a, b) => (b.pieceCount || 0) - (a.pieceCount || 0)),
    emptyMessage: 'No piece counts available',
  },
  {
    id: 'icons',
    title: 'Icons',
    getSets: (sets) => sets.filter((s) => s.theme?.toLowerCase() === 'icons'),
    emptyMessage: 'No Icons sets',
    viewAllFilter: 'theme=Icons',
  },
  {
    id: 'technic',
    title: 'Technic',
    getSets: (sets) => sets.filter((s) => s.theme?.toLowerCase().includes('technic')),
    emptyMessage: 'No Technic sets',
    viewAllFilter: 'theme=Technic',
  },
];

export function CollectionHome({ sets }: CollectionHomeProps): React.JSX.Element {
  // Compute sections with their sets
  const sections = useMemo(() => {
    return SECTIONS.map((section) => ({
      ...section,
      sets: section.getSets(sets),
    })).filter((section) => section.sets.length > 0);
  }, [sets]);

  if (sets.length === 0) {
    return (
      <div className={styles.empty}>
        <p>Your collection is empty.</p>
        <p>Add some sets to get started!</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {sections.map((section) => (
        <SetCarousel
          key={section.id}
          title={section.title}
          sets={section.sets}
          emptyMessage={section.emptyMessage}
        />
      ))}
    </div>
  );
}

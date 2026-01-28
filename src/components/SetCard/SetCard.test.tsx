import { render, screen } from '@testing-library/react';
import { Timestamp } from 'firebase/firestore';
import { SetCard } from './SetCard';
import type { LegoSet } from '@/types';

// Mock Next.js Image component
jest.mock('next/image', () => ({
  __esModule: true,
  default: function MockImage({ src, alt }: { src: string; alt: string }) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={alt} />;
  },
}));

// Mock Next.js Link component
jest.mock('next/link', () => ({
  __esModule: true,
  default: function MockLink({
    children,
    href,
  }: {
    children: React.ReactNode;
    href: string;
    className?: string;
  }) {
    return <a href={href}>{children}</a>;
  },
}));

const mockSet: LegoSet = {
  id: 'set-1',
  collectionId: 'collection-1',
  setNumber: '75192',
  name: 'Millennium Falcon',
  pieceCount: 7541,
  year: 2017,
  theme: 'Star Wars',
  subtheme: 'Ultimate Collector Series',
  imageUrl: 'https://example.com/falcon.jpg',
  status: 'assembled',
  hasBeenAssembled: true,
  occasion: 'Birthday',
  dateReceived: Timestamp.fromDate(new Date('2020-01-01')),
  owner: 'Ryan',
  dataSource: 'rebrickable',
  createdAt: Timestamp.now(),
  updatedAt: Timestamp.now(),
};

describe('SetCard', () => {
  it('renders set name and number', () => {
    render(<SetCard set={mockSet} />);

    expect(screen.getByText('Millennium Falcon')).toBeInTheDocument();
    expect(screen.getByText('75192')).toBeInTheDocument();
  });

  it('renders set image when available', () => {
    render(<SetCard set={mockSet} />);

    const image = screen.getByRole('img');
    expect(image).toHaveAttribute('src', 'https://example.com/falcon.jpg');
    expect(image).toHaveAttribute('alt', 'Millennium Falcon');
  });

  it('renders placeholder when no image', () => {
    const setWithoutImage = { ...mockSet, imageUrl: null };
    render(<SetCard set={setWithoutImage} />);

    expect(screen.getByText('No Image')).toBeInTheDocument();
  });

  it('prefers custom image over default image', () => {
    const setWithCustomImage = {
      ...mockSet,
      customImageUrl: 'https://example.com/custom.jpg',
    };
    render(<SetCard set={setWithCustomImage} />);

    const image = screen.getByRole('img');
    expect(image).toHaveAttribute('src', 'https://example.com/custom.jpg');
  });

  it('renders status label', () => {
    render(<SetCard set={mockSet} />);

    expect(screen.getByText('Assembled')).toBeInTheDocument();
  });

  it('renders owner when present', () => {
    render(<SetCard set={mockSet} />);

    expect(screen.getByText('Ryan')).toBeInTheDocument();
  });

  it('does not render owner when absent', () => {
    const setWithoutOwner = { ...mockSet, owner: '' };
    render(<SetCard set={setWithoutOwner} />);

    expect(screen.queryByText('Ryan')).not.toBeInTheDocument();
  });

  it('renders piece count formatted with locale', () => {
    render(<SetCard set={mockSet} />);

    expect(screen.getByText('7,541 pcs')).toBeInTheDocument();
  });

  it('renders theme', () => {
    render(<SetCard set={mockSet} />);

    expect(screen.getByText('Star Wars')).toBeInTheDocument();
  });

  it('links to the set detail page', () => {
    render(<SetCard set={mockSet} />);

    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/collection/set-1');
  });

  it('renders different status labels correctly', () => {
    const statusTests = [
      { status: 'unopened', label: 'Unopened' },
      { status: 'in_progress', label: 'In Progress' },
      { status: 'rebuild_in_progress', label: 'Rebuilding' },
      { status: 'assembled', label: 'Assembled' },
      { status: 'disassembled', label: 'Disassembled' },
    ] as const;

    statusTests.forEach(({ status, label }) => {
      const { unmount } = render(<SetCard set={{ ...mockSet, status }} />);
      expect(screen.getByText(label)).toBeInTheDocument();
      unmount();
    });
  });
});

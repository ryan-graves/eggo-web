import { render, screen } from '@testing-library/react';
import { SetPlate } from './SetPlate';
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
  status: 'in_progress',
  hasBeenAssembled: false,
  occasion: 'Birthday',
  dateReceived: '2020-01-01',
  owners: ['Ryan'],
  dataSource: 'rebrickable',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

describe('SetPlate', () => {
  it('renders set name and number', () => {
    render(<SetPlate set={mockSet} />);

    expect(screen.getByText('Millennium Falcon')).toBeInTheDocument();
    expect(screen.getByText('#75192')).toBeInTheDocument();
  });

  it('renders the spec line of pieces, year, and theme', () => {
    render(<SetPlate set={mockSet} />);

    expect(
      screen.getByText('7,541 pieces · 2017 · Star Wars')
    ).toBeInTheDocument();
  });

  it('renders set image when available', () => {
    render(<SetPlate set={mockSet} />);

    const image = screen.getByRole('img');
    expect(image).toHaveAttribute('src', 'https://example.com/falcon.jpg');
    expect(image).toHaveAttribute('alt', 'Millennium Falcon');
  });

  it('renders placeholder when no image', () => {
    render(<SetPlate set={{ ...mockSet, imageUrl: null }} />);

    expect(screen.getByText('No Image')).toBeInTheDocument();
  });

  it('prefers custom image over default image', () => {
    render(
      <SetPlate
        set={{ ...mockSet, customImageUrl: 'https://example.com/custom.jpg' }}
      />
    );

    expect(screen.getByRole('img')).toHaveAttribute(
      'src',
      'https://example.com/custom.jpg'
    );
  });

  it('renders the status label', () => {
    render(<SetPlate set={mockSet} />);

    expect(screen.getByText('In Progress')).toBeInTheDocument();
  });

  it('hides the status label when hideStatus is set', () => {
    render(<SetPlate set={mockSet} hideStatus />);

    expect(screen.queryByText('In Progress')).not.toBeInTheDocument();
  });

  it('links to the set detail page by default', () => {
    render(<SetPlate set={mockSet} />);

    expect(screen.getByRole('link')).toHaveAttribute('href', '/set/set-1');
  });

  it('uses linkPrefix for the set detail href when provided', () => {
    render(<SetPlate set={mockSet} linkPrefix="/share/abc123/set" />);

    expect(screen.getByRole('link')).toHaveAttribute(
      'href',
      '/share/abc123/set/set-1'
    );
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
      const { unmount } = render(<SetPlate set={{ ...mockSet, status }} />);
      expect(screen.getByText(label)).toBeInTheDocument();
      unmount();
    });
  });
});

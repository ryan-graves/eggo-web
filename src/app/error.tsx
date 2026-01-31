'use client';

import Link from 'next/link';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function Error({ error, reset }: ErrorProps): React.JSX.Element {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        padding: '20px',
        textAlign: 'center',
      }}
    >
      <h1 style={{ fontSize: '24px', marginBottom: '16px' }}>Something went wrong</h1>
      <p style={{ marginBottom: '8px', opacity: 0.7 }}>
        {error.message || 'An unexpected error occurred'}
      </p>
      {error.digest && (
        <p style={{ fontSize: '12px', opacity: 0.5, marginBottom: '24px' }}>
          Error ID: {error.digest}
        </p>
      )}
      <div style={{ display: 'flex', gap: '12px' }}>
        <button
          onClick={reset}
          style={{
            padding: '12px 24px',
            fontSize: '14px',
            backgroundColor: 'var(--interactive-primary, #3b82f6)',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
          }}
        >
          Try again
        </button>
        <Link
          href="/"
          style={{
            padding: '12px 24px',
            fontSize: '14px',
            backgroundColor: 'transparent',
            color: 'var(--text-primary, inherit)',
            border: '1px solid var(--border-primary, #333)',
            borderRadius: '8px',
            textDecoration: 'none',
          }}
        >
          Go home
        </Link>
      </div>
    </div>
  );
}

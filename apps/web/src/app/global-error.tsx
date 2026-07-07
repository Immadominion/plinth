'use client';

import { useEffect } from 'react';

/* Top-level error boundary — replaces the root layout when an error escapes it,
   so it must render its own <html>/<body> and can't rely on globals.css. Kept
   self-contained with inline brand-matched styles. */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'grid',
          placeItems: 'center',
          background: '#f5f5f3',
          color: '#0a0a0a',
          fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif',
        }}
      >
        <div style={{ textAlign: 'center', padding: 24, maxWidth: 420 }}>
          <h1 style={{ fontSize: 20, fontWeight: 600, margin: '0 0 8px' }}>
            Plinth hit an unexpected error
          </h1>
          <p style={{ color: '#71716c', fontSize: 14, lineHeight: 1.5, margin: '0 0 20px' }}>
            The app failed to load. Reload to try again — your data is safe.
          </p>
          {error.digest ? (
            <p style={{ fontFamily: 'monospace', fontSize: 11, color: '#a3a39e', margin: '0 0 16px' }}>
              Reference: {error.digest}
            </p>
          ) : null}
          <button
            type="button"
            onClick={() => reset()}
            style={{
              background: '#0b8366',
              color: '#fff',
              border: 'none',
              borderRadius: 10,
              padding: '10px 18px',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Reload
          </button>
        </div>
      </body>
    </html>
  );
}

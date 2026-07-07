'use client';

import { useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

/* Dashboard route error boundary — catches an uncaught throw in any dashboard
   segment and offers recovery instead of white-screening. `reset()` re-renders
   the segment. Wire this into Sentry once the Next 15 upgrade lands. */
export default function DashboardError({
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
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center">
      <span className="grid h-12 w-12 place-items-center rounded-full bg-danger-tint text-danger">
        <AlertTriangle size={22} />
      </span>
      <h1 className="mt-5 font-display text-xl font-semibold text-ink">
        This section didn&rsquo;t load
      </h1>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-mid">
        Something went wrong rendering this page. Your data is safe — try again, and if it keeps
        happening, contact support.
      </p>
      {error.digest ? (
        <p className="mt-3 font-mono text-[11px] text-faint">Reference: {error.digest}</p>
      ) : null}
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <Button onClick={() => reset()}>Try again</Button>
        <Button variant="outline" onClick={() => window.location.assign('/dashboard')}>
          Back to overview
        </Button>
      </div>
    </div>
  );
}

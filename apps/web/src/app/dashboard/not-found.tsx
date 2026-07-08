import Link from 'next/link';
import { Compass } from 'lucide-react';

/* Rendered when a dashboard route calls notFound() (e.g. an unknown customer id)
   or matches nothing. Keeps the user inside the app with a clear way back. */
export default function DashboardNotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center">
      <span className="grid h-12 w-12 place-items-center rounded-full bg-soft text-mid">
        <Compass size={22} />
      </span>
      <h1 className="mt-5 font-display text-xl font-semibold text-ink">We couldn&rsquo;t find that</h1>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-mid">
        This record may have been removed, or the link is out of date.
      </p>
      <Link
        href="/dashboard"
        className="mt-6 inline-flex h-9 items-center justify-center rounded-lg bg-jade-deep px-4 text-[13.5px] font-medium text-white shadow-[0_1px_2px_rgba(10,10,10,0.12)] transition hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-jade/40 focus-visible:ring-offset-1 focus-visible:ring-offset-canvas"
      >
        Back to overview
      </Link>
    </div>
  );
}

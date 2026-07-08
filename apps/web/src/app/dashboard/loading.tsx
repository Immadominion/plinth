/* Instant Suspense fallback for dashboard segment navigations — a content-shaped
   skeleton (not a spinner) so layout doesn't jump. animate-pulse is neutralised
   under prefers-reduced-motion by the global reduced-motion rule in globals.css. */
export default function DashboardLoading() {
  return (
    <div className="p-6" aria-busy="true" aria-label="Loading">
      <div className="h-7 w-52 animate-pulse rounded-lg bg-soft" />
      <div className="mt-2 h-4 w-72 animate-pulse rounded bg-soft/70" />

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-28 animate-pulse rounded-xl bg-soft" />
        ))}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <div className="h-72 animate-pulse rounded-xl bg-soft lg:col-span-2" />
        <div className="h-72 animate-pulse rounded-xl bg-soft" />
      </div>
    </div>
  );
}

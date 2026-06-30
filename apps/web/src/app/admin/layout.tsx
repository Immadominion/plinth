import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Super Admin — Plinth',
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950">
      {children}
    </div>
  );
}

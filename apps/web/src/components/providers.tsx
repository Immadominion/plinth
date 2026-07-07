'use client';
import { ThemeProvider, useTheme } from 'next-themes';
import { Toaster } from 'sonner';

/* Toasts follow the active theme and use sonner's rich semantic colors for
   success/error. Every mutation now reflects a real outcome — no more silent
   failures or fake success. */
function BrandToaster() {
  const { resolvedTheme } = useTheme();
  return (
    <Toaster
      theme={resolvedTheme === 'dark' ? 'dark' : 'light'}
      position="bottom-right"
      richColors
      closeButton
      toastOptions={{ style: { fontFamily: 'inherit', borderRadius: '10px' } }}
    />
  );
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      {children}
      <BrandToaster />
    </ThemeProvider>
  );
}

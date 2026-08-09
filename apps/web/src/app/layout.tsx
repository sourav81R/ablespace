import type { Metadata, Viewport } from 'next';
import { THEME_INIT_SCRIPT } from '@/lib/theme/theme';
import { Providers } from './providers';
import './globals.css';

export const metadata: Metadata = {
  title: 'AbleSpace — Task Management',
  description: 'Plan, track and complete work across your workspace.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // Zooming stays enabled: disabling it is an accessibility failure for anyone
  // who needs to enlarge text.
  maximumScale: 5,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/*
          Runs before first paint so the stored theme is already applied when
          the page renders. Without it the default theme paints first and React
          swaps it after hydration, which reads as a flash.

          suppressHydrationWarning on <html> is required because this script
          mutates the element the server just rendered.
        */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="min-h-screen bg-background text-foreground antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

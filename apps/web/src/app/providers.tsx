'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { AuthProvider } from '@/lib/auth/auth-provider';
import { ThemeProvider } from '@/lib/theme/theme-provider';
import { ApiError } from '@/lib/api/client';

/**
 * Client-side providers.
 *
 * Order matters: AuthProvider calls useQueryClient to clear the cache on
 * sign-out, so it must sit inside QueryClientProvider.
 */
export function Providers({ children }: { children: React.ReactNode }) {
  // Created in state rather than at module scope so each browser session gets
  // its own cache. A module-level client would be shared across requests on
  // the server and leak one user's data into another's render.
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            gcTime: 5 * 60_000,
            refetchOnWindowFocus: false,
            retry: (failureCount, error) => {
              // Never retry a rejected session or a missing resource — the
              // outcome will not change, and the delay just makes the UI feel
              // broken.
              if (error instanceof ApiError && (error.isAuthError || error.isNotFound)) {
                return false;
              }
              return failureCount < 2;
            },
          },
          mutations: {
            retry: false,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>{children}</AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAuth } from '@/lib/auth/auth-provider';

/**
 * Entry route.
 *
 * Redirects rather than rendering: where the user belongs depends on whether
 * Firebase has restored a session, which is only known on the client.
 */
export default function HomePage() {
  const router = useRouter();
  const { loading, isAuthenticated } = useAuth();

  useEffect(() => {
    // Wait for the restore to finish: redirecting while loading would bounce a
    // signed-in user to the login screen before Firebase reports them.
    if (loading) return;
    router.replace(isAuthenticated ? '/tasks' : '/login');
  }, [loading, isAuthenticated, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div
        className="h-6 w-6 animate-spin rounded-full border-2 border-border border-t-primary"
        role="status"
        aria-label="Loading"
      />
    </div>
  );
}

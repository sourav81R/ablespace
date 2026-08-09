'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { useAuth } from '@/lib/auth/auth-provider';
import { useSession } from '@/lib/api/use-session';
import { Button } from '@/components/ui/button';
import { AppShell } from '@/components/layout/app-shell';

/**
 * Guards every authenticated route.
 *
 * Two gates, in order: Firebase must have a user, and the API must resolve
 * that user to an application account. Rendering children before both succeed
 * would let a page fire requests it cannot authenticate.
 */
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { loading, isAuthenticated, logout } = useAuth();
  const session = useSession();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.replace('/login');
    }
  }, [loading, isAuthenticated, router]);

  // Firebase is still restoring the session, or the redirect above is about to
  // fire. Either way there is nothing safe to render yet.
  if (loading || !isAuthenticated) {
    return <FullPageSpinner />;
  }

  // The session request rejected the token outright. Signing out clears the
  // stale credential and returns the user to a working state.
  if (session.isError && session.error.isAuthError) {
    return (
      <FullPageMessage
        title="Your session has expired"
        description="Please sign in again to continue."
        action={
          <Button
            onClick={async () => {
              await logout();
              router.replace('/login');
            }}
          >
            Back to sign in
          </Button>
        }
      />
    );
  }

  if (session.isError) {
    return (
      <FullPageMessage
        title="Could not load your workspace"
        description={session.error.message}
        action={
          <Button onClick={() => session.refetch()} variant="outline">
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Try again
          </Button>
        }
      />
    );
  }

  if (!session.data) {
    return <FullPageSpinner />;
  }

  // The shell mounts only once both gates pass, so navigation and the account
  // menu never render against a half-resolved session.
  return <AppShell>{children}</AppShell>;
}

function FullPageSpinner() {
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

function FullPageMessage({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm text-center">
        <div className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-danger-muted">
          <AlertCircle className="h-5 w-5 text-danger" aria-hidden="true" />
        </div>
        <h1 className="text-lg font-semibold text-foreground">{title}</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">{description}</p>
        <div className="mt-5 flex justify-center">{action}</div>
      </div>
    </div>
  );
}

'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AlertCircle, ArrowRight } from 'lucide-react';
import { useAuth } from '@/lib/auth/auth-provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { GoogleIcon } from '@/components/ui/icons';

/**
 * The way into the product.
 *
 * Both paths end in the same place: Firebase issues an ID token, the API
 * verifies it and provisions the application user on first sight, and the
 * workspace opens. The only difference is which Firebase provider mints the
 * token.
 */
export default function LoginPage() {
  const router = useRouter();
  const { loading, isAuthenticated, error, pending, signInGuest, signInGoogle, configured } =
    useAuth();
  const [email, setEmail] = useState('');

  // A signed-in user landing here (say, from a bookmark) belongs in the app.
  useEffect(() => {
    if (isAuthenticated) {
      router.replace('/tasks');
    }
  }, [isAuthenticated, router]);

  const handleGuest = async () => {
    try {
      await signInGuest();
      router.replace('/tasks');
    } catch {
      // AuthProvider has already turned this into a readable message.
    }
  };

  const handleGoogle = async () => {
    try {
      await signInGoogle();
      router.replace('/tasks');
    } catch {
      // As above.
    }
  };

  // Avoid flashing the form to someone who is already signed in.
  if (loading || isAuthenticated) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
        <div
          className="h-6 w-6 animate-spin rounded-full border-2 border-border border-t-primary"
          role="status"
          aria-label="Loading"
        />
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <div className="w-full max-w-[400px]">
        <div className="mb-7 flex flex-col items-center text-center">
          <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
            <span className="text-lg font-semibold">A</span>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Let&apos;s get back on track
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Sign in to pick up where you left off.
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          {!configured && (
            <div
              role="alert"
              className="mb-5 flex gap-2.5 rounded-md border border-warning/30 bg-warning-muted p-3 text-xs text-foreground"
            >
              <AlertCircle className="mt-px h-4 w-4 shrink-0 text-warning" aria-hidden="true" />
              <span>
                Firebase is not configured. Copy <code>.env.example</code> to{' '}
                <code>.env.local</code> and add your Firebase web credentials.
              </span>
            </div>
          )}

          {error && (
            <div
              role="alert"
              className="mb-5 flex gap-2.5 rounded-md border border-danger/30 bg-danger-muted p-3 text-xs text-foreground"
            >
              <AlertCircle className="mt-px h-4 w-4 shrink-0 text-danger" aria-hidden="true" />
              <span>{error}</span>
            </div>
          )}

          {/*
            Email is present because the design shows it, but no password
            provider is enabled on this project — so the field is disabled and
            says why, rather than silently failing on submit.
          */}
          <Input
            label="Email"
            type="email"
            placeholder="you@company.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
            disabled
          />
          <p className="mt-1.5 text-2xs text-muted-foreground">
            Email sign-in is not enabled for this workspace. Continue as a guest or use Google.
          </p>

          <div className="mt-5 space-y-2.5">
            <Button
              size="lg"
              className="w-full"
              onClick={handleGuest}
              loading={pending}
              disabled={!configured}
            >
              Continue as Guest
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Button>

            <div className="relative py-1.5">
              <div className="absolute inset-0 flex items-center" aria-hidden="true">
                <div className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center">
                <span className="bg-card px-2 text-2xs uppercase tracking-wide text-muted-foreground">
                  or
                </span>
              </div>
            </div>

            <Button
              variant="outline"
              size="lg"
              className="w-full"
              onClick={handleGoogle}
              disabled={pending || !configured}
            >
              <GoogleIcon className="h-4 w-4" />
              Continue with Google
            </Button>
          </div>
        </div>

        <p className="mt-5 text-center text-2xs leading-relaxed text-muted-foreground">
          By continuing you agree to our{' '}
          <a href="#" className="underline underline-offset-2 hover:text-foreground">
            Terms of Service
          </a>{' '}
          and{' '}
          <a href="#" className="underline underline-offset-2 hover:text-foreground">
            Privacy Policy
          </a>
          .
        </p>
      </div>
    </main>
  );
}

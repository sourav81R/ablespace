'use client';

import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';
import { useSession } from '@/lib/api/use-session';
import { useAuth } from '@/lib/auth/auth-provider';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/lib/theme/theme-provider';
import { ACCENT_LABELS, ACCENT_SWATCHES, ACCENTS } from '@/lib/theme/theme';

/**
 * Placeholder workspace screen.
 *
 * It exists to prove the authentication chain end to end — Firebase token,
 * verified by the API, resolved to a real MongoDB user and workspace. The
 * board, list and task detail replace this.
 */
export default function TasksPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const { logout, isAnonymous } = useAuth();
  const { mode, accent, toggleMode, setAccent } = useTheme();

  if (!session) return null;

  return (
    <main className="mx-auto max-w-3xl p-6">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-foreground">
            {session.workspace.name}
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Signed in as {session.user.displayName}
            {isAnonymous ? ' (guest)' : ''}
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={async () => {
            await logout();
            router.replace('/login');
          }}
        >
          <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
          Sign out
        </Button>
      </div>

      <div className="rounded-lg border border-border bg-card p-5">
        <h2 className="text-sm font-medium text-foreground">Authentication verified</h2>
        <dl className="mt-3 grid gap-2 text-xs">
          <Row label="Application user" value={session.user.id} />
          <Row label="Workspace" value={session.workspace.id} />
          <Row label="Role" value={session.role} />
          <Row label="Provider" value={session.user.provider} />
          {session.user.email && <Row label="Email" value={session.user.email} />}
        </dl>
      </div>

      <div className="mt-4 rounded-lg border border-border bg-card p-5">
        <h2 className="text-sm font-medium text-foreground">Theme</h2>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={toggleMode}>
            Mode: {mode}
          </Button>

          {ACCENTS.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setAccent(option)}
              aria-label={`Use ${ACCENT_LABELS[option]} accent`}
              aria-pressed={accent === option}
              className="flex h-7 w-7 items-center justify-center rounded-full border transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              style={{
                backgroundColor: ACCENT_SWATCHES[option],
                borderColor: accent === option ? 'hsl(var(--foreground))' : 'transparent',
              }}
            />
          ))}
        </div>

        <p className="mt-3 text-xs text-muted-foreground">
          Both preferences persist across reloads.
        </p>
      </div>
    </main>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-mono text-foreground">{value}</dd>
    </div>
  );
}

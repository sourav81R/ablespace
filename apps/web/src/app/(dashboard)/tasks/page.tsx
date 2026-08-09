'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ListTodo, LogOut } from 'lucide-react';
import { useSession } from '@/lib/api/use-session';
import { useTasks } from '@/lib/api/use-tasks';
import { useAuth } from '@/lib/auth/auth-provider';
import { Button } from '@/components/ui/button';
import { DataState, EmptyState } from '@/components/ui/states';
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
  const tasks = useTasks();

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

        <div className="flex shrink-0 items-center gap-2">
          <Link
            href="/projects"
            className="rounded-md px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            Projects
          </Link>
          <Link
            href="/settings/profile"
            className="rounded-md px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            Profile
          </Link>
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
      </div>

      <DataState
        isLoading={tasks.isLoading}
        error={tasks.error}
        data={tasks.data}
        isEmpty={(page) => page.data.length === 0}
        onRetry={() => tasks.refetch()}
        emptyFallback={
          <EmptyState
            icon={<ListTodo className="h-5 w-5" aria-hidden="true" />}
            title="No tasks yet"
            description="Run `pnpm seed` to load the demo board, or create a task from the API."
          />
        }
      >
        {(page) => (
          <ul className="divide-y divide-border rounded-lg border border-border">
            {page.data.map((task) => (
              <li key={task.id}>
                <Link
                  href={`/tasks/${task.id}`}
                  className="flex items-center justify-between gap-3 px-4 py-2.5 transition-colors hover:bg-muted/40"
                >
                  <span className="min-w-0 truncate text-sm text-foreground">{task.title}</span>
                  <span className="shrink-0 text-xs capitalize text-muted-foreground">
                    {task.status.replace('_', ' ').toLowerCase()}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </DataState>

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


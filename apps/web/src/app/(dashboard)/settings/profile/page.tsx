'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check } from 'lucide-react';
import { useSession } from '@/lib/api/use-session';
import { useLeaveWorkspace, useUpdateProfile } from '@/lib/api/use-profile';
import { useAuth } from '@/lib/auth/auth-provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/states';

export default function ProfilePage() {
  const router = useRouter();
  const { data: session } = useSession();
  const { isAnonymous, logout } = useAuth();
  const updateProfile = useUpdateProfile();
  const leaveWorkspace = useLeaveWorkspace();

  const [displayName, setDisplayName] = useState('');
  const [title, setTitle] = useState('');
  const [username, setUsername] = useState('');
  const [saved, setSaved] = useState(false);

  // Seed the form once the session arrives. Keyed on the user id so switching
  // account repopulates rather than keeping the previous person's values.
  useEffect(() => {
    if (!session) return;
    setDisplayName(session.user.displayName);
    setTitle(session.user.title ?? '');
    setUsername(session.user.username ?? '');
  }, [session]);

  if (!session) {
    return (
      <main className="mx-auto max-w-2xl p-4 sm:p-6">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="mt-4 h-64 w-full" />
      </main>
    );
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaved(false);
    await updateProfile.mutateAsync({
      displayName: displayName.trim(),
      // An empty field means "unset", which the API models as null rather
      // than an empty string.
      title: title.trim() || null,
      username: username.trim() || null,
    });
    setSaved(true);
  };

  const handleLeave = async () => {
    const confirmed = window.confirm(
      'Leave this workspace? If you are the last member, its tasks and projects are deleted permanently.',
    );
    if (!confirmed) return;

    await leaveWorkspace.mutateAsync();
    await logout();
    router.replace('/login');
  };

  return (
    <main className="mx-auto max-w-2xl p-4 sm:p-6">
      <header className="mb-5">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">Profile</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          How you appear to others in this workspace.
        </p>
      </header>

      <form onSubmit={handleSubmit} className="rounded-lg border border-border bg-card p-5">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary text-base font-semibold text-primary-foreground">
            {session.user.avatarUrl ? (
              <img
                src={session.user.avatarUrl}
                alt=""
                className="h-full w-full rounded-full object-cover"
              />
            ) : (
              displayName.slice(0, 1).toUpperCase() || 'U'
            )}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-foreground">
              {session.user.email ?? 'Guest account'}
            </p>
            <p className="text-xs text-muted-foreground">
              {isAnonymous ? 'Signed in as a guest' : `Signed in with ${session.user.provider.toLowerCase()}`}
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <Input
            label="Full name"
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            required
            maxLength={120}
          />
          <Input
            label="Title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Product Designer"
            maxLength={120}
          />
          <Input
            label="Username"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            placeholder="sourav"
            maxLength={60}
            error={
              updateProfile.error?.code === 'CONFLICT'
                ? 'That username is already taken.'
                : undefined
            }
          />
        </div>

        {updateProfile.isError && updateProfile.error.code !== 'CONFLICT' && (
          <p role="alert" className="mt-4 text-xs text-danger">
            {updateProfile.error.message}
          </p>
        )}

        <div className="mt-5 flex items-center gap-3">
          <Button type="submit" loading={updateProfile.isPending}>
            Save changes
          </Button>
          {saved && !updateProfile.isPending && (
            <span className="flex items-center gap-1 text-xs text-success" role="status">
              <Check className="h-3.5 w-3.5" aria-hidden="true" />
              Saved
            </span>
          )}
        </div>
      </form>

      <section className="mt-5 rounded-lg border border-border bg-card p-5">
        <h2 className="text-sm font-medium text-foreground">Workspace</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          {session.workspace.name} · {session.role.toLowerCase()}
        </p>

        <div className="mt-4 rounded-md border border-danger/30 bg-danger-muted p-3">
          <p className="text-xs text-foreground">
            Leaving removes your membership. If you are the last member, the workspace and
            everything in it is deleted permanently.
          </p>
          <Button
            variant="danger"
            size="sm"
            className="mt-3"
            onClick={handleLeave}
            loading={leaveWorkspace.isPending}
          >
            Leave workspace
          </Button>
        </div>
      </section>
    </main>
  );
}

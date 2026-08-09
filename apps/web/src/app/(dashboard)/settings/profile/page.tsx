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
import { ConfirmDialog } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/toast';

export default function ProfilePage() {
  const router = useRouter();
  const { data: session } = useSession();
  const { isAnonymous, logout } = useAuth();
  const updateProfile = useUpdateProfile();
  const leaveWorkspace = useLeaveWorkspace();

  const [displayName, setDisplayName] = useState('');
  const [title, setTitle] = useState('');
  const [username, setUsername] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [saved, setSaved] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const { notify } = useToast();

  // Seed the form once the session arrives. Keyed on the user id so switching
  // account repopulates rather than keeping the previous person's values.
  useEffect(() => {
    if (!session) return;
    setDisplayName(session.user.displayName);
    setTitle(session.user.title ?? '');
    setUsername(session.user.username ?? '');
    setAvatarUrl(session.user.avatarUrl ?? '');
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
      avatarUrl: avatarUrl.trim() || null,
    });
    setSaved(true);
    notify('Profile updated');
  };

  const handleLeave = async () => {
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
          {/* Previews the URL as typed, so a broken link is obvious before
              saving rather than after. */}
          <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary text-lg font-semibold text-primary-foreground">
            {avatarUrl.trim() ? (
              <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              displayName.slice(0, 1).toUpperCase() || 'U'
            )}
          </div>

          <div className="min-w-0 flex-1">
            <Input
              label="Profile picture"
              type="url"
              value={avatarUrl}
              onChange={(event) => setAvatarUrl(event.target.value)}
              placeholder="https://example.com/photo.jpg"
              // A URL rather than an upload: there is no file storage in this
              // system, and a fake upload control would promise one.
              inputMode="url"
            />
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label
              htmlFor="profile-email"
              className="mb-1.5 block text-xs font-medium text-foreground"
            >
              Email
            </label>
            <input
              id="profile-email"
              type="email"
              value={session.user.email ?? ''}
              placeholder={isAnonymous ? 'Guest account — no email' : ''}
              readOnly
              disabled
              className="h-9 w-full rounded-md border border-input bg-muted px-3 text-sm text-muted-foreground"
            />
            <p className="mt-1.5 text-2xs text-muted-foreground">
              {isAnonymous
                ? 'Guest accounts have no email. Sign in with Google to add one.'
                : `Managed by ${session.user.provider.toLowerCase()} sign-in and cannot be changed here.`}
            </p>
          </div>

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
            onClick={() => setConfirmLeave(true)}
            loading={leaveWorkspace.isPending}
          >
            Leave workspace
          </Button>
        </div>
      </section>

      {/* An in-app dialog rather than window.confirm: the native one ignores
          the theme, cannot be styled, and is blocked outright in some
          browsers. */}
      <ConfirmDialog
        open={confirmLeave}
        onClose={() => setConfirmLeave(false)}
        onConfirm={handleLeave}
        title="Leave this workspace?"
        description="Your membership is removed. If you are the last member, the workspace and everything in it is deleted permanently."
        confirmLabel="Leave workspace"
        loading={leaveWorkspace.isPending}
      />
    </main>
  );
}

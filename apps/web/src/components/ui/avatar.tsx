'use client';

import { cn } from '@/lib/utils/cn';

const SIZES = {
  xs: 'h-5 w-5 text-[9px]',
  sm: 'h-6 w-6 text-[10px]',
  md: 'h-8 w-8 text-xs',
  lg: 'h-10 w-10 text-sm',
} as const;

type Size = keyof typeof SIZES;

/** First letters of the first two words — "Ada Lovelace" becomes "AL". */
function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0] ?? '')
    .join('')
    .toUpperCase();
}

export function Avatar({
  name,
  src,
  size = 'md',
  className,
}: {
  name: string;
  src?: string | null;
  size?: Size;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 select-none items-center justify-center overflow-hidden rounded-full bg-primary-muted font-medium text-primary ring-1 ring-inset ring-border',
        SIZES[size],
        className,
      )}
      // The name is already shown next to most avatars, so the image itself is
      // decorative; a title gives it back where it stands alone.
      title={name}
    >
      {src ? (
        <img src={src} alt="" className="h-full w-full object-cover" />
      ) : (
        initials(name) || '?'
      )}
    </span>
  );
}

/**
 * Overlapping avatars with a "+N" overflow chip.
 *
 * Used wherever a task shows its members without room for a full list.
 */
export function AvatarGroup({
  users,
  max = 3,
  size = 'sm',
}: {
  users: Array<{ id: string; displayName: string; avatarUrl?: string | null }>;
  max?: number;
  size?: Size;
}) {
  if (users.length === 0) return null;

  const shown = users.slice(0, max);
  const overflow = users.length - shown.length;

  return (
    <span className="flex items-center -space-x-1.5">
      {shown.map((user) => (
        <Avatar
          key={user.id}
          name={user.displayName}
          src={user.avatarUrl}
          size={size}
          className="ring-2 ring-card"
        />
      ))}
      {overflow > 0 && (
        <span
          className={cn(
            'inline-flex items-center justify-center rounded-full bg-muted font-medium text-muted-foreground ring-2 ring-card',
            SIZES[size],
          )}
        >
          +{overflow}
        </span>
      )}
    </span>
  );
}

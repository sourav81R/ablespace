'use client';

import { AlertCircle, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { Button } from './button';

/** A shimmering placeholder shaped like the content it stands in for. */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-md bg-muted', className)} aria-hidden="true" />;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border px-6 py-12 text-center">
      {icon && (
        <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
          {icon}
        </div>
      )}
      <p className="text-sm font-medium text-foreground">{title}</p>
      {description && (
        <p className="mt-1 max-w-sm text-xs text-muted-foreground">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorState({
  title = 'Something went wrong',
  description,
  onRetry,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
}) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center justify-center rounded-lg border border-danger/30 bg-danger-muted px-6 py-10 text-center"
    >
      <AlertCircle className="mb-3 h-6 w-6 text-danger" aria-hidden="true" />
      <p className="text-sm font-medium text-foreground">{title}</p>
      {description && <p className="mt-1 max-w-sm text-xs text-muted-foreground">{description}</p>}
      {onRetry && (
        <Button variant="outline" size="sm" className="mt-4" onClick={onRetry}>
          <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
          Try again
        </Button>
      )}
    </div>
  );
}

/**
 * Resolves the four states of a data surface in one place.
 *
 * Written once and reused rather than repeating the same
 * loading/error/empty/success ladder on every screen — which is where the
 * inconsistencies creep in.
 */
export function DataState<T>({
  isLoading,
  error,
  data,
  isEmpty,
  loadingFallback,
  emptyFallback,
  onRetry,
  children,
}: {
  isLoading: boolean;
  error: { message: string } | null;
  data: T | undefined;
  isEmpty?: (data: T) => boolean;
  loadingFallback?: React.ReactNode;
  emptyFallback?: React.ReactNode;
  onRetry?: () => void;
  children: (data: T) => React.ReactNode;
}) {
  if (isLoading && data === undefined) {
    return <>{loadingFallback ?? <DefaultLoading />}</>;
  }

  if (error) {
    return <ErrorState description={error.message} onRetry={onRetry} />;
  }

  if (data === undefined) {
    return <>{loadingFallback ?? <DefaultLoading />}</>;
  }

  if (isEmpty?.(data) && emptyFallback) {
    return <>{emptyFallback}</>;
  }

  return <>{children(data)}</>;
}

function DefaultLoading() {
  return (
    <div className="space-y-2.5" role="status" aria-label="Loading">
      <Skeleton className="h-14 w-full" />
      <Skeleton className="h-14 w-full" />
      <Skeleton className="h-14 w-full" />
    </div>
  );
}

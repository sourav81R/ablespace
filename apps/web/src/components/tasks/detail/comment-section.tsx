'use client';

import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import type { CommentDto } from '@ablespace/shared';
import { useComments, useCreateComment, useDeleteComment } from '@/lib/api/use-tasks';
import { useSession } from '@/lib/api/use-session';
import { DataState, EmptyState } from '@/components/ui/states';
import { ConfirmDialog } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/toast';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';

export function CommentSection({ taskId }: { taskId: string }) {
  const comments = useComments(taskId);

  return (
    <div className="space-y-4">
      <CommentComposer taskId={taskId} />

      <DataState
        isLoading={comments.isLoading}
        error={comments.error}
        data={comments.data}
        isEmpty={(page) => page.data.length === 0}
        onRetry={() => comments.refetch()}
        emptyFallback={<EmptyState title="No comments yet" description="Start the discussion." />}
      >
        {(page) => (
          <ul className="space-y-3">
            {page.data.map((comment) => (
              <CommentItem key={comment.id} taskId={taskId} comment={comment} />
            ))}
          </ul>
        )}
      </DataState>
    </div>
  );
}

/** The input for a new comment. */
function CommentComposer({ taskId }: { taskId: string }) {
  const createComment = useCreateComment(taskId);
  const { data: session } = useSession();
  const { notify } = useToast();
  const [body, setBody] = useState('');

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = body.trim();
    if (!trimmed) return;

    createComment.mutate(trimmed, {
      onSuccess: () => {
        setBody('');
        notify('Comment added');
      },
      onError: (error) => notify(error.message, 'error'),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2.5">
      {session && (
        <Avatar
          name={session.user.displayName}
          src={session.user.avatarUrl}
          size="sm"
          className="mt-0.5"
        />
      )}

      <div className="min-w-0 flex-1">
        <textarea
          value={body}
          onChange={(event) => setBody(event.target.value)}
          onKeyDown={(event) => {
            // Submit on Ctrl/Cmd+Enter; plain Enter keeps making new lines,
            // since comments are often more than one.
            if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
              handleSubmit(event);
            }
          }}
          rows={2}
          maxLength={5000}
          placeholder="Write a comment…"
          aria-label="Write a comment"
          className="w-full resize-y rounded-md border border-input bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />

        <div className="mt-2 flex items-center justify-between gap-2">
          <span className="text-2xs text-muted-foreground">
            {body.length > 4500 ? `${5000 - body.length} characters left` : 'Ctrl + Enter to send'}
          </span>
          <Button
            type="submit"
            size="sm"
            loading={createComment.isPending}
            disabled={!body.trim()}
          >
            Comment
          </Button>
        </div>
      </div>
    </form>
  );
}

/** A single comment, with delete offered only to its author. */
function CommentItem({ taskId, comment }: { taskId: string; comment: CommentDto }) {
  const deleteComment = useDeleteComment(taskId);
  const { data: session } = useSession();
  const { notify } = useToast();
  const [confirmOpen, setConfirmOpen] = useState(false);

  // The API enforces this too; hiding the control avoids offering an action
  // that would only fail.
  const isAuthor = Boolean(session && comment.author && session.user.id === comment.author.id);

  return (
    <li className="flex gap-2.5">
      <Avatar
        name={comment.author?.displayName ?? 'Unknown'}
        src={comment.author?.avatarUrl}
        size="sm"
        className="mt-0.5"
      />

      <div className="min-w-0 flex-1 rounded-lg border border-border bg-card p-3">
        <div className="mb-1 flex items-center gap-2">
          <span className="truncate text-xs font-medium text-foreground">
            {comment.author?.displayName ?? 'Unknown'}
          </span>
          <time dateTime={comment.createdAt} className="shrink-0 text-2xs text-muted-foreground">
            {formatRelative(comment.createdAt)}
          </time>

          {isAuthor && (
            <button
              type="button"
              onClick={() => setConfirmOpen(true)}
              aria-label="Delete comment"
              className="ml-auto shrink-0 rounded p-1 text-muted-foreground transition-colors hover:bg-danger-muted hover:text-danger"
            >
              <Trash2 className="h-3 w-3" aria-hidden="true" />
            </button>
          )}
        </div>

        <p className="whitespace-pre-wrap break-words text-sm text-foreground">{comment.body}</p>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() =>
          deleteComment.mutate(comment.id, {
            onSuccess: () => {
              setConfirmOpen(false);
              notify('Comment deleted');
            },
            onError: (error) => notify(error.message, 'error'),
          })
        }
        title="Delete this comment?"
        description="This cannot be undone."
        loading={deleteComment.isPending}
      />
    </li>
  );
}

/** "3h ago" for recent items, an absolute date once that stops being useful. */
export function formatRelative(iso: string): string {
  const date = new Date(iso);
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86_400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604_800) return `${Math.floor(seconds / 86_400)}d ago`;

  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

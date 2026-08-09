'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { UserDto } from '@ablespace/shared';
import { api, ApiError } from './client';
import { queryKeys } from './queries';

/**
 * Fields the profile screen may change.
 *
 * Email, provider and the anonymous flag are absent by design: they come from
 * the verified Firebase token, and the API rejects a request that tries to set
 * them.
 */
export interface ProfileInput {
  displayName?: string;
  title?: string | null;
  username?: string | null;
  avatarUrl?: string | null;
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation<UserDto, ApiError, ProfileInput>({
    mutationFn: (input) => api.patch<UserDto>('/users/me', input),
    onSuccess: () => {
      // The session carries the user, and avatars appear on task cards and in
      // comments, so both the session and the member list are now stale.
      queryClient.invalidateQueries({ queryKey: queryKeys.session });
      queryClient.invalidateQueries({ queryKey: queryKeys.members });
    },
  });
}

export function useLeaveWorkspace() {
  const queryClient = useQueryClient();

  return useMutation<void, ApiError, void>({
    mutationFn: () => api.post('/workspaces/me/leave'),
    onSuccess: () => queryClient.clear(),
  });
}

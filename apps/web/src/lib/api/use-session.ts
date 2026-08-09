'use client';

import { useQuery } from '@tanstack/react-query';
import type { SessionDto } from '@ablespace/shared';
import { api, ApiError } from './client';
import { queryKeys } from './queries';
import { useAuth } from '../auth/auth-provider';

/**
 * Resolves the application user for the signed-in Firebase account.
 *
 * This is the hinge in the authentication chain:
 *
 *   Firebase user -> ID token -> GET /auth/me -> MongoDB user + workspace
 *
 * The first call for a given UID provisions the user, their workspace, the
 * owner membership and a starter set of labels; every later call simply finds
 * them. The Firebase account alone is not enough to use the product — nothing
 * can be fetched until this resolves.
 */
export function useSession() {
  const { user, status } = useAuth();

  return useQuery<SessionDto, ApiError>({
    queryKey: queryKeys.session,
    queryFn: () => api.get<SessionDto>('/auth/me'),

    // Only ask once Firebase has actually produced a user, otherwise the
    // request goes out with no token and comes back 401.
    enabled: status === 'authenticated' && Boolean(user),

    // The session rarely changes within a visit, and every mutation that could
    // affect it invalidates the key explicitly.
    staleTime: 5 * 60 * 1000,

    retry: (failureCount, error) => {
      // A 401 here means the token is genuinely rejected — the API client has
      // already retried once with a refreshed token. Retrying further just
      // delays sending the user back to sign in.
      if (error.isAuthError) return false;
      return failureCount < 2;
    },
  });
}

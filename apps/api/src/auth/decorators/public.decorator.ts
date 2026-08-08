import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Marks a route as reachable without authentication.
 *
 * The guard is registered globally so routes are protected by default; opting
 * out has to be explicit and visible at the handler. Forgetting the decorator
 * makes a route private, which is the safe direction to fail.
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

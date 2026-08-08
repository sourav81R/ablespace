/**
 * Escapes regular-expression metacharacters in user input.
 *
 * Search terms reach MongoDB as `$regex` patterns. Without escaping, a user
 * typing `.*` or `(a+)+` would either match everything or build a
 * catastrophically backtracking pattern — so every user-supplied string is run
 * through this before it becomes part of a query.
 */
export function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

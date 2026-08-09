import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merges class names, letting later Tailwind classes win over earlier ones.
 *
 * Plain concatenation leaves both `px-3` and `px-6` in the string and the
 * winner depends on stylesheet order, which makes a component's `className`
 * prop unreliable. twMerge resolves the conflict deterministically.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

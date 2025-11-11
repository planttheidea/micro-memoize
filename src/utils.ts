import type { Memoized } from './internalTypes.ts';

/**
 * Whether the value passed is a memoized function via `micro-memoize`.
 */
export function isMemoized(fn: any): fn is Memoized<any, any> {
  return typeof fn === 'function' && fn.isMemoized;
}

/**
 * Determine whether the value passed is a numeric value for usage in common contexts.
 * This is a positive, finite integer.
 */
export function isNumericValueValid(value: any): value is number {
  return typeof value === 'number' && value >= 0 && Number.isFinite(value);
}

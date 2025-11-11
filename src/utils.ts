import type { Memoized } from './internalTypes.ts';

export function isMemoized(fn: any): fn is Memoized<any, any> {
  return typeof fn === 'function' && fn.isMemoized;
}

export function isNumericValueValid(value: any): value is number {
  return typeof value === 'number' && value >= 0 && Number.isFinite(value);
}

import type { Memoized } from './internalTypes.ts';

export function isMemoized(fn: any): fn is Memoized<any, any> {
  return typeof fn === 'function' && fn.isMemoized;
}

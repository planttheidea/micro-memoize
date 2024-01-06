import type { Memoize } from './dist/umd/types/internalTypes.d';

export * from './dist/umd/types/internalTypes.d';
export type { Cache } from './dist/umd/types/Cache.d';

/**
 * Memoize the given function, with options available to customize the
 * way the memoization is handled.
 */
declare const memoize: Memoize;

export default memoize;

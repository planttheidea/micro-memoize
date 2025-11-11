import type { Key, Memoize, Memoized, Options } from './internalTypes.ts';
import { Cache } from './Cache.js';
import { isMemoized } from './utils.js';
import { getExpirationManager } from './expires.js';
import { getWrappedForceUpdateMoize } from './forceUpdate.js';
import { getStatsManager } from './stats.js';

export type * from './internalTypes.ts';
export type { Cache };

export const memoize: Memoize = function memoize<
  Fn extends (...args: any[]) => any,
  Opts extends Options<Fn>,
>(fn: Fn | Memoized<Fn, Opts>, options: Opts = {} as Opts): Memoized<Fn, Opts> {
  if (typeof fn !== 'function') {
    throw new TypeError(
      `Expected first parameter to be function; received ${typeof fn}`,
    );
  }

  if (isMemoized(fn)) {
    return memoize(fn.fn, Object.assign({}, fn.options, options));
  }

  const memoized: Memoized<Fn, Opts> = function memoized(
    this: any,
    ...args: Parameters<Fn>
  ) {
    const cache = memoized.cache;
    const key: Key = cache.k ? cache.k(args) : args;

    let node = cache.g(key);

    if (!node) {
      node = cache.n(key, fn.apply(this, args) as ReturnType<Fn>);

      cache.o && cache.o.n('add', node);
    } else if (node !== cache.h) {
      cache.u(node);

      if (cache.o) {
        cache.o.n('hit', node);
        cache.o.n('update', node);
      }
    } else if (cache.o) {
      cache.o.n('hit', node);
    }

    return node.v;
  };

  const cache = new Cache(options);

  memoized.cache = cache;
  memoized.expirationManager = getExpirationManager(cache, options);
  memoized.fn = fn;
  memoized.isMemoized = true;
  memoized.options = options;
  memoized.statsManager = getStatsManager(cache, options);

  return options.forceUpdate ? getWrappedForceUpdateMoize(memoized) : memoized;
};

export {
  clearStats,
  isCollectingStats,
  getStats,
  startCollectingStats,
  stopCollectingStats,
} from './stats.js';

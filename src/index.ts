import { Cache } from './Cache.js';
import { ExpirationManager } from './expires.js';
import { getWrappedForceUpdateMoize } from './forceUpdate.js';
import type { Key, Memoize, Memoized, Options } from './internalTypes.js';
import { StatsManager } from './stats.js';
import { isMemoized } from './utils.js';

export type * from './internalTypes.js';

export const memoize: Memoize = function memoize<Fn extends (...args: any[]) => any, Opts extends Options<Fn>>(
  fn: Fn | Memoized<Fn, Opts>,
  options: Opts = {} as Opts,
): Memoized<Fn, Opts> {
  if (isMemoized(fn)) {
    return memoize(fn.fn, Object.assign({}, fn.options, options));
  }

  if (typeof fn !== 'function') {
    throw new TypeError(`Expected first parameter to be function; received ${typeof fn}`);
  }

  const cache = new Cache(options);

  const memoized = function memoized(this: any, ...args: Parameters<Fn>) {
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
  } as Memoized<Fn, Opts>;

  memoized.cache = cache;
  memoized.expirationManager = options.expires != null ? new ExpirationManager(cache, options.expires) : null;
  memoized.fn = fn;
  memoized.isMemoized = true;
  memoized.options = options;
  memoized.statsManager = options.statsName != null ? new StatsManager(cache, options.statsName) : null;

  return typeof options.forceUpdate === 'function'
    ? getWrappedForceUpdateMoize(memoized, options.forceUpdate)
    : memoized;
};

export { clearStats, isCollectingStats, getStats, startCollectingStats, stopCollectingStats } from './stats.js';

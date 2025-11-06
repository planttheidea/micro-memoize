import type { Key, Memoize, Memoized, Options } from './internalTypes.ts';
import { Cache } from './Cache.js';
import { cloneKey, isMemoized } from './utils.js';

export type * from './internalTypes.ts';

export { Cache };

const memoize: Memoize = function memoize<
  Fn extends (...args: any[]) => any,
  Opts extends Options<Fn>,
>(
  fn: Fn | Memoized<Fn, Opts>,
  passedOptions: Opts = {} as Opts,
): Memoized<Fn, Opts> {
  if (typeof fn !== 'function') {
    throw new TypeError(
      `Expected first parameter to be function; received ${typeof fn}`,
    );
  }

  if (isMemoized(fn)) {
    return memoize(fn.fn, Object.assign({}, fn.options, passedOptions));
  }

  const memoized: Memoized<Fn, Opts> = function memoized(this: any) {
    const cache = memoized.cache;
    const key = cache.k ? cache.k(arguments) : (arguments as unknown as Key);
    const node = cache.g(key);

    if (node) {
      if (node === cache.h) {
        cache.oh?.n(node);
      } else {
        cache.u(node);
        cache.oh?.n(node);
        cache.ou?.n(node);
      }

      return node.v;
    }

    const newNode = cache.n(
      cache.k ? key : cloneKey(key),
      // @ts-expect-error - allow usage of arguments as pass-through to fn
      fn.apply(this, arguments) as ReturnType<Fn>,
    );

    cache.oa?.n(newNode);

    return newNode.v;
  };

  memoized.cache = new Cache(passedOptions);
  memoized.fn = fn;
  memoized.isMemoized = true;
  memoized.options = passedOptions;

  return memoized;
};

export default memoize;

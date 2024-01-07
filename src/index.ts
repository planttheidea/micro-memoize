import type { Key, Memoize, Memoized, Options } from './internalTypes';
import { Cache } from './Cache';
import { cloneKey, isMemoized } from './utils';

export type * from './internalTypes';

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
    const transformKey = cache.k;
    const key = transformKey
      ? transformKey(arguments)
      : (arguments as unknown as Key);
    let node = cache.g(key);

    if (node === cache.h) {
      cache.oh && cache.oh.n(node);
    } else if (node) {
      cache.u(node);
      cache.ou && cache.ou.n(node);
    } else {
      node = cache.n(
        transformKey ? key : cloneKey(key),
        // @ts-expect-error - allow usage of arguments as pass-through to fn
        fn.apply(this, arguments),
      );

      cache.oa && cache.oa.n(node);
    }

    return node.v;
  };

  memoized.cache = new Cache(passedOptions);
  memoized.fn = fn;
  memoized.isMemoized = true;
  memoized.options = passedOptions;

  return memoized;
};

export default memoize;

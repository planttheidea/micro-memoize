import type { Key, Memoized, Options } from '../index.d';
import { Cache } from './Cache';
import { cloneKey, isMemoized } from './utils';

export default function memoize<Fn extends (...args: any[]) => any>(
  fn: Fn,
  passedOptions?: Options<Fn>,
): Memoized<Fn>;
export default function memoize<Fn extends (...args: any[]) => any>(
  fn: Memoized<Fn>,
  passedOptions?: Options<Fn>,
): Memoized<Fn>;
export default function memoize<Fn extends (...args: any[]) => any>(
  fn: Fn | Memoized<Fn>,
  passedOptions: Options<Fn> = {},
): Memoized<Fn> {
  if (typeof fn !== 'function') {
    throw new TypeError(
      `Expected first parameter to be function; received ${typeof fn}`,
    );
  }

  if (isMemoized(fn)) {
    return memoize(fn.fn, Object.assign({}, fn.options, passedOptions));
  }

  const cache = new Cache(passedOptions);

  const memoized: Memoized<Fn> = function memoized(this: any) {
    const { h: head, k: transformKey } = cache;
    const key: Key = transformKey
      ? transformKey(arguments)
      : (arguments as unknown as Key);
    let node = cache.g(key);

    if (node === head) {
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

  memoized.cache = cache;
  memoized.fn = fn;
  memoized.isMemoized = true;
  memoized.options = passedOptions;

  return memoized;
}

memoize.Cache = Cache;

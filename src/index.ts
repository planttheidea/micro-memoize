import type { Key, Memoized, Options } from '../index.d';
import { Cache } from './Cache';
import { cloneKey, getEntry, isMemoized } from './utils';

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
    const { h: prevHead, k: transformKey } = cache;
    const key: Key = transformKey
      ? transformKey(arguments)
      : (arguments as unknown as Key);
    let node = cache.g(key);

    if (node) {
      if (cache.oh && node === prevHead) {
        cache.oh.n({ cache, entry: getEntry(node), type: 'hit' });
      } else if (cache.ou && node !== prevHead) {
        cache.ou.n({ cache, entry: getEntry(node), type: 'update' });
      }
    } else {
      node = cache.n(
        transformKey ? key : cloneKey(key),
        // @ts-expect-error - allow usage of arguments as pass-through to fn
        fn.apply(this, arguments),
      );

      cache.oa && cache.oa.n({ cache, entry: getEntry(node), type: 'add' });
    }

    return node.v;
  };

  memoized.cache = cache;
  memoized.fn = fn;
  memoized.isMemoized = true;
  memoized.options = passedOptions;

  return memoized;
}

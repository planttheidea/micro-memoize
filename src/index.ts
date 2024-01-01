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
  const { k: transformKey, o: onChange } = cache;

  const memoized: Memoized<Fn> = function memoized(this: any) {
    // @ts-expect-error - `arguments` does not line up with `Parameters<Fn>`
    const key: Key = transformKey ? transformKey!(arguments) : arguments;
    const prevHead = cache.h;
    // @ts-expect-error - `g` is not surfaced on public API
    let node = cache.g(key);

    if (node) {
      onChange &&
        onChange(node === prevHead ? 'hit' : 'update', getEntry(node), cache);
      return node.v;
    }

    // @ts-expect-error - `n` is not surfaced on public API
    node = cache.n(
      transformKey ? key : cloneKey(key),
      // @ts-expect-error - allow usage of arguments as pass-through to fn
      fn.apply(this, arguments),
    );
    onChange && onChange('add', getEntry(node), cache);

    return node.v;
  };

  memoized.cache = cache;
  memoized.fn = fn;
  memoized.isMemoized = true;
  memoized.options = passedOptions;

  return memoized;
}

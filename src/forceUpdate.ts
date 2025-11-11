import type { ForceUpdate, Memoized, Options } from './internalTypes.ts';

/**
 * Create a wrapped memoized method that will conditionally update the cache based on
 * the result of the option passed.
 */
export function getWrappedForceUpdateMoize<
  Fn extends (...args: any[]) => any,
  Opts extends Options<Fn>,
>(
  memoized: Memoized<Fn, Opts>,
  forceUpdate: ForceUpdate<Fn>,
): Memoized<Fn, Opts> {
  const { cache } = memoized;

  return Object.assign(function (this: any, ...args: Parameters<Fn>) {
    if (!forceUpdate(args) || !cache.has(args)) {
      return memoized.apply(this, args);
    }

    const value = memoized.fn.apply(this, args) as ReturnType<Fn>;

    memoized.cache.set(args, value, 'forced');

    return value;
  }, memoized) as Memoized<Fn, Opts>;
}

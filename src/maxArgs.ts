import type { Key, TransformKey } from './internalTypes.js';

/**
 * Create a method that takes the first N number of items from the array (faster than slice).
 */
export function getMaxArgsTransformKey<Fn extends (...args: any[]) => any>(
  maxArgs: number,
): TransformKey<Fn> | undefined {
  if (maxArgs === 1) {
    return (args: Key) => (maxArgs >= args.length ? args : [args[0]]);
  }

  if (maxArgs === 2) {
    return (args: Key) => (maxArgs >= args.length ? args : [args[0], args[1]]);
  }

  return (args: Key) => {
    if (maxArgs >= args.length) {
      return args;
    }

    const clone = new Array(maxArgs);

    for (let index = 0; index < maxArgs; ++index) {
      clone[index] = args[index];
    }

    return clone;
  };
}

import { stringify } from 'fast-stringify';
import type { Key } from './internalTypes.js';

/**
 * Default replacer used when stringifying to ensure values that would normally be
 * ignored are respected.
 */
function replacer(key: string, value: any) {
  const type = typeof value;

  return type === 'function' || type === 'symbol' ? value.toString() : value;
}

/**
 * Default serializer used when `serialize` option set to `true`.
 */
export function transformKeySerialized<Fn extends (...args: any[]) => any>(args: Parameters<Fn>) {
  return [stringify(args, { replacer })];
}

/**
 * Determines whether the serialized keys are equal to one another.
 */
export function isSerializedKeyEqual(prevKey: Key, nextKey: Key) {
  return prevKey[0] === nextKey[0];
}

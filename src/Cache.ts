import { deepEqual, shallowEqual } from 'fast-equals';
import { CacheEventEmitter } from './CacheEventEmitter.js';
import type {
  CacheEntry,
  CacheEventType,
  CacheEventListener,
  CacheNode,
  CacheSnapshot,
  IsKeyItemEqual,
  Key,
  Options,
  IsKeyEqual,
  TransformKey,
} from './internalTypes.js';
import { getMaxArgsTransformKey } from './maxArgs.js';
import { isSerializedKeyEqual, transformKeySerialized } from './serialize.js';
import { isNumericValueValid } from './utils.js';

export class Cache<Fn extends (...args: any[]) => any> {
  /**
   * The current [c]ount of entries in the cache.
   */
  c = 0;
  /**
   * The [h]ead of the cache linked list.
   */
  h: CacheNode<Fn> | undefined;
  /**
   * Whether the individual argument passed [i]s equal to the same argument in order
   * for a key in cache.
   */
  i: IsKeyItemEqual;
  /**
   * The transformer for the [k]ey stored in cache.
   */
  k: Options<Fn>['transformKey'] | undefined;
  /**
   * Whether the entire key [m]atches an existing key in cache.
   */
  m: IsKeyEqual;
  /**
   * Event emitter for `[o]`n events.
   */
  o: CacheEventEmitter<Fn> | undefined;
  /**
   * Whether to await the [p]romise returned by the function.
   */
  p: Options<Fn>['async'];
  /**
   * The maximum [s]ize of the cache.
   */
  s: number;
  /**
   * The [t]ail of the cache linked list.
   */
  t: CacheNode<Fn> | undefined;

  constructor(options: Options<Fn>) {
    const { async, isKeyEqual, isKeyItemEqual, maxSize, serialize } = options;

    this.i =
      typeof isKeyItemEqual === 'function'
        ? isKeyItemEqual
        : isKeyItemEqual === 'deep'
          ? deepEqual
          : isKeyItemEqual === 'shallow'
            ? shallowEqual
            : Object.is;
    this.m =
      typeof isKeyEqual === 'function'
        ? isKeyEqual
        : serialize
          ? isSerializedKeyEqual
          : // eslint-disable-next-line @typescript-eslint/unbound-method
            this.e;

    this.p = typeof async === 'boolean' && async;
    this.s = isNumericValueValid(maxSize) ? maxSize : 1;

    this.k = getTransformKey(options);
  }

  /**
   * The size of the populated cache.
   */
  get size(): number {
    return this.c;
  }

  /**
   * The [key, value] pairs for the existing entries in cache.
   */
  get snapshot(): CacheSnapshot<Fn> {
    const entries: Array<CacheEntry<Fn>> = [];
    const keys: Key[] = [];
    const values: Array<ReturnType<Fn>> = [];

    let node = this.h;
    let size = 0;

    while (node != null) {
      keys.push(node.k);
      values.push(node.v);
      entries.push([node.k, node.v]);
      ++size;

      node = node.n;
    }

    return { entries, keys, size, values };
  }

  /**
   * Clear the cache.
   */
  clear(reason = 'explicit clear'): void {
    if (!this.h) {
      return;
    }

    const emitter = this.o;

    let nodes: Array<CacheNode<Fn>> | undefined;

    if (emitter) {
      nodes = [];

      let node: CacheNode<Fn> | undefined = this.h;

      while (node != null) {
        nodes.push(node);
        node = node.n;
      }
    }

    this.h = this.t = undefined;
    this.c = 0;

    if (emitter && nodes) {
      for (let index = 0; index < nodes.length; ++index) {
        emitter.n('delete', nodes[index]!, reason);
      }
    }
  }

  /**
   * Delete the entry for the given `key` in cache.
   */
  delete(key: Parameters<Fn>, reason = 'explicit delete'): boolean {
    const node = this.k ? this.gt(key) : this.g(key);

    if (node) {
      this.d(node);
      this.o && this.o.n('delete', node, reason);

      return true;
    }

    return false;
  }

  /**
   * Get the value in cache based on the given `key`.
   */
  get(key: Parameters<Fn>, reason = 'explicit get'): ReturnType<Fn> | undefined {
    const node = this.k ? this.gt(key) : this.g(key);

    if (node) {
      if (node !== this.h) {
        this.u(node);

        this.o && this.o.n('hit', node, reason);
        this.o && this.o.n('update', node, reason);
      } else if (this.o) {
        this.o.n('hit', node, reason);
      }

      return node.v;
    }
  }

  /**
   * Determine whether the given `key` has a related entry in the cache.
   */
  has(key: Parameters<Fn>): boolean {
    return !!(this.k ? this.gt(key) : this.g(key));
  }

  /**
   * Remove the given `listener` for the given `type` of cache event.
   */
  off<Type extends CacheEventType>(type: Type, listener: CacheEventListener<Type, Fn>): void {
    this.o && this.o.r(type, listener);
  }

  /**
   * Add the given `listener` for the given `type` of cache event.
   */
  on<Type extends CacheEventType>(type: Type, listener: CacheEventListener<Type, Fn>): void {
    if (!this.o) {
      this.o = new CacheEventEmitter<Fn>(this);
    }

    this.o.a(type, listener);
  }

  /**
   * Add or update the cache entry for the given `key`.
   */
  set(key: Parameters<Fn>, value: ReturnType<Fn>, reason = 'explicit set'): void {
    const normalizedKey = this.k ? this.k(key) : key;

    let node = this.g(normalizedKey);

    if (node) {
      const prevValue = node.v;

      node.v = value;

      if (this.p && value !== prevValue) {
        node.v = this.w(node);
      }

      node !== this.h && this.u(node);

      this.o && this.o.n('update', node, reason);
    } else {
      node = this.n(normalizedKey, value);

      this.o && this.o.n('add', node, reason);
    }
  }

  /**
   * Method to [d]elete the given `node` from the cache.
   */
  d(node: CacheNode<Fn>): void {
    const next = node.n;
    const prev = node.p;

    if (next) {
      next.p = prev;
    } else {
      this.t = prev;
    }

    if (prev) {
      prev.n = next;
    } else {
      this.h = next;
    }

    --this.c;
  }

  /**
   * Method to determine if the next key is [e]qual to an existing key in cache.
   */
  e(prevKey: Key, nextKey: Key): boolean {
    const length = nextKey.length;

    if (prevKey.length !== length) {
      return false;
    }

    if (length === 1) {
      return this.i(prevKey[0], nextKey[0], 0);
    }

    for (let index = 0; index < length; ++index) {
      if (!this.i(prevKey[index], nextKey[index], index)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Method to [g]et an existing node from cache based on the given `key`.
   */
  g(key: Key): CacheNode<Fn> | undefined {
    let node = this.h;

    if (!node) {
      return;
    }

    if (this.m(node.k, key)) {
      return node;
    }

    if (this.h === this.t) {
      return;
    }

    node = node.n;

    while (node) {
      if (this.m(node.k, key)) {
        return node;
      }

      node = node.n;
    }
  }

  /**
   * Method to [g]et an existing node from cache based on the [t]ransformed `key`.
   */
  gt(key: Parameters<Fn>): CacheNode<Fn> | undefined {
    return this.g(this.k ? this.k(key) : key);
  }

  /**
   * Method to create a new [n]ode and set it at the head of the linked list.
   */
  n(key: Key, value: ReturnType<Fn>): CacheNode<Fn> {
    const prevHead = this.h;
    const prevTail = this.t;
    const node = { k: key, n: prevHead, p: undefined, v: value };

    if (this.p) {
      node.v = this.w(node);
    }

    this.h = node;

    if (prevHead) {
      prevHead.p = node;
    } else {
      this.t = node;
    }

    if (++this.c > this.s && prevTail) {
      this.d(prevTail);
      this.o && this.o.n('delete', prevTail, 'evicted');
    }

    return node;
  }

  /**
   * Method to [u]date the location of the given `node` in cache.
   */
  u(node: CacheNode<Fn>): void {
    const next = node.n;
    const prev = node.p;

    if (next) {
      next.p = prev;
    }

    if (prev) {
      prev.n = next;
    }

    if (this.h) {
      this.h.p = node;
    }

    node.n = this.h;
    node.p = undefined;

    this.h = node;

    if (node === this.t) {
      this.t = prev;
    }
  }

  /**
   * Method to [w]rap the promise in a handler to automatically delete the
   * entry if it rejects.
   */
  w(node: CacheNode<Fn>): ReturnType<Fn> {
    const { k: key, v: value } = node;

    // If the method does not return a promise for some reason, just keep the
    // original value.
    if (value == null || typeof value.then !== 'function') {
      return value;
    }

    return value.then(
      (value: any) => {
        if (this.o && this.g(key)) {
          this.o.n('update', node, 'resolved');
        }

        return value;
      },
      (error: unknown) => {
        if (this.g(key)) {
          this.d(node);
          this.o && this.o.n('delete', node, 'rejected');
        }

        throw error;
      },
    );
  }
}

/**
 * Get the `transformKey` option based on the options provided.
 */
export function getTransformKey<Fn extends (...args: any[]) => any>(
  options: Options<Fn>,
): TransformKey<Fn> | undefined {
  const { maxArgs, serialize, transformKey } = options;

  const transformers: Array<(...args: any[]) => any> = [];

  if (serialize) {
    const transformer = typeof serialize === 'function' ? serialize : transformKeySerialized;

    transformers.push(transformer);
  }

  if (isNumericValueValid(maxArgs)) {
    const transformer = getMaxArgsTransformKey(maxArgs);

    if (transformer) {
      transformers.push(transformer);
    }
  }

  if (typeof transformKey === 'function') {
    transformers.push(transformKey);
  }

  return transformers.length
    ? transformers.reduce(
        (f, g) =>
          (...args) =>
            // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
            f(g(...args)),
      )
    : undefined;
}

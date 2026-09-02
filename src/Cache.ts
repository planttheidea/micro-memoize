import { deepEqual, shallowEqual } from 'fast-equals';
import { CacheEventEmitter } from './CacheEventEmitter.js';
import type {
  CacheEntry,
  CacheEventType,
  CacheEventListener,
  CacheNode,
  CacheSnapshot,
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
   * Whether the entire key is [e]qual to an existing key in cache.
   */
  e: IsKeyEqual;
  /**
   * The [h]ead of the cache linked list.
   */
  h: CacheNode<Fn> | undefined;
  /**
   * The transformer for the [k]ey stored in cache.
   */
  k: Options<Fn>['transformKey'] | undefined;
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
    const { async, maxSize } = options;

    this.e = getIsKeyEqual(options);
    this.k = getTransformKey(options);
    this.p = typeof async === 'boolean' && async;
    this.s = isNumericValueValid(maxSize) ? maxSize : 1;
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
    let node: CacheNode<Fn> | undefined = this.h;

    if (!node) {
      return;
    }

    const emitter = this.o;
    const nodes: Array<CacheNode<Fn>> | undefined = emitter ? [] : undefined;

    // Each node must be marked as [r]emoved and unlinked from its neighbors, otherwise any
    // deferred operation still holding a reference to it (an async entry that settles after
    // the clear, for example) can rewire the discarded list back into the cache.
    while (node != null) {
      const next: CacheNode<Fn> | undefined = node.n;

      node.n = node.p = undefined;
      node.r = true;

      nodes && nodes.push(node);

      node = next;
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
   * Delete the entry for the key based on the given `args` in cache.
   */
  delete(args: Parameters<Fn>, reason = 'explicit delete'): boolean {
    const node = this.g(this.k ? this.k(args) : args);

    if (node) {
      this.d(node, reason);

      return true;
    }

    return false;
  }

  /**
   * Get the value in cache based on the given `args`.
   */
  get(args: Parameters<Fn>, reason = 'explicit get'): ReturnType<Fn> | undefined {
    const node = this.g(this.k ? this.k(args) : args);

    if (node) {
      if (node !== this.h) {
        this.u(node, reason, true);
      } else if (this.o) {
        this.o.n('hit', node, reason);
      }

      return node.v;
    }
  }

  /**
   * Determine whether the given `args` have a related entry in the cache.
   */
  has(args: Parameters<Fn>): boolean {
    return !!this.g(this.k ? this.k(args) : args);
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

      node !== this.h && this.u(node, reason, false);
    } else {
      node = this.n(normalizedKey, value);
    }
  }

  /**
   * Method to [d]elete the given `node` from the cache.
   */
  d(node: CacheNode<Fn>, reason: string): void {
    if (node.r) {
      // Already removed from cache; re-running the unlink against its stale neighbors would
      // corrupt the list and drive the count below zero.
      return;
    }

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

    node.n = node.p = undefined;
    node.r = true;

    this.o && this.o.n('delete', node, reason);
  }

  /**
   * Method to [g]et an existing node from cache based on the given `key`.
   */
  g(key: Key): CacheNode<Fn> | undefined {
    let node = this.h;

    if (!node || node.r) {
      return;
    }

    if (this.e(node.k, key)) {
      return node;
    }

    if (this.h === this.t) {
      return;
    }

    node = node.n;

    while (node) {
      if (node.r) {
        return;
      }

      if (this.e(node.k, key)) {
        return node;
      }

      node = node.n;
    }
  }

  /**
   * Method to create a new [n]ode and set it at the head of the linked list.
   */
  n(key: Key, value: ReturnType<Fn>, reason?: string): CacheNode<Fn> {
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
      this.d(prevTail, 'evicted');
    }

    this.o && this.o.n('add', node, reason);

    return node;
  }

  /**
   * Method to [u]date the location of the given `node` in cache.
   */
  u(node: CacheNode<Fn>, reason: string | undefined, hit: boolean): void {
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

    if (this.o) {
      hit && this.o.n('hit', node, reason);
      this.o.n('update', node, reason);
    }
  }

  /**
   * Method to [w]rap the promise in a handler to automatically delete the
   * entry if it rejects.
   */
  w(node: CacheNode<Fn>): ReturnType<Fn> {
    const { v: value } = node;

    // If the method does not return a promise for some reason, just keep the
    // original value.
    if (value == null || typeof value.then !== 'function') {
      return value;
    }

    return value.then(
      (value: any) => {
        !node.r && this.o && this.o.n('update', node, 'resolved');

        return value;
      },
      (error: unknown) => {
        !node.r && this.d(node, 'rejected');

        throw error;
      },
    );
  }

  /**
   * Method to create a new node for a single-entry cache, the default and most common
   * configuration.
   *
   * A cache of this si[z]e is never a list: there is nothing to link the new node to, nothing
   * to count, and the entry it replaces can be evicted outright instead of being spliced out.
   *
   * @NOTE
   * This leaves the cache in the same shape a single-entry list would have, so the general
   * methods (`set`, `delete`, `clear`) continue to operate on it correctly.
   */
  z(key: Key, value: ReturnType<Fn>, reason?: string): CacheNode<Fn> {
    const prevHead = this.h;
    const node = { k: key, n: undefined, p: undefined, v: value };

    if (this.p) {
      node.v = this.w(node);
    }

    this.h = this.t = node;
    this.c = 1;

    if (prevHead) {
      prevHead.r = true;

      this.o && this.o.n('delete', prevHead, 'evicted');
    }

    this.o && this.o.n('add', node, reason);

    return node;
  }
}

function getIsKeyEqual<Fn extends (...args: any[]) => any>({
  isKeyEqual,
  isKeyItemEqual,
  serialize,
}: Options<Fn>): IsKeyEqual {
  if (typeof isKeyEqual === 'function') {
    return isKeyEqual;
  }

  if (serialize) {
    return isSerializedKeyEqual;
  }

  const isItemEqual =
    typeof isKeyItemEqual === 'function'
      ? isKeyItemEqual
      : isKeyItemEqual === 'deep'
        ? deepEqual
        : isKeyItemEqual === 'shallow'
          ? shallowEqual
          : Object.is;

  return function isKeyEqual(prevKey: Key, nextKey: Key): boolean {
    const length = nextKey.length;

    if (prevKey.length !== length) {
      return false;
    }

    if (length === 1) {
      return isItemEqual(prevKey[0], nextKey[0], 0);
    }

    for (let index = 0; index < length; ++index) {
      if (!isItemEqual(prevKey[index], nextKey[index], index)) {
        return false;
      }
    }

    return true;
  };
}

/**
 * Get the `transformKey` option based on the options provided.
 */
function getTransformKey<Fn extends (...args: any[]) => any>(options: Options<Fn>): TransformKey<Fn> | undefined {
  const { maxArgs, serialize, transformKey } = options;

  const transformers = [
    serialize ? (typeof serialize === 'function' ? serialize : transformKeySerialized) : undefined,
    isNumericValueValid(maxArgs) ? getMaxArgsTransformKey(maxArgs) : undefined,
    typeof transformKey === 'function' ? transformKey : undefined,
  ].filter(Boolean) as Array<(...args: any[]) => any>;

  return transformers.length
    ? transformers.reduce(
        (f, g) =>
          (...args) =>
            // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
            f(g(...args)),
      )
    : undefined;
}

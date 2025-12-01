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

    this.e = createIsKeyEqual(options);
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
}

function createIsKeyEqual<Fn extends (...args: any[]) => any>({
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

import { CacheEventEmitter } from "./CacheEventEmitter.js";
import type {
  Arg,
  CacheEntry,
  CacheEventType,
  CacheEventListener,
  CacheNode,
  CacheSnapshot,
  Key,
  KeyTransformer,
  Options,
} from "./internalTypes.ts";
import { getDefault, isSameValueZero } from "./utils.js";

export class Cache<Fn extends (...args: any[]) => any> {
  /**
   * Whether the individual [a]rgument passed is equal to the same argument in order
   * for a key in cache.
   */
  a: (a: Arg, b: Arg) => boolean;
  /**
   * The current [c]ount of entries in the cache.
   */
  c = 0;
  /**
   * The [h]ead of the cache linked list.
   */
  h: CacheNode<Fn> | undefined;
  /**
   * The transformer for the [k]ey stored in cache.
   */
  k: KeyTransformer<Fn> | undefined;
  /**
   * Whether the entire key [m]atches an existing key in cache.
   */
  m: (a: Key, b: Key) => boolean;
  /**
   * Event emitter for `[o]`n events.
   */
  o: CacheEventEmitter<Fn> | undefined;
  /**
   * Whether to await the [p]romise returned by the function.
   */
  p: boolean;
  /**
   * The maximum [s]ize of the cache.
   */
  s: number;
  /**
   * The [t]ail of the cache linked list.
   */
  t: CacheNode<Fn> | undefined;

  constructor(options: Options<Fn>) {
    const transformKey = getDefault("function", options.transformKey);

    this.a = getDefault("function", options.isArgEqual, isSameValueZero);
    this.m = getDefault(
      "function",
      options.isKeyEqual,
      // eslint-disable-next-line @typescript-eslint/unbound-method
      this.e
    );
    this.p = getDefault("boolean", options.async, false);
    this.s = getDefault("number", options.maxSize, 1);

    if (transformKey || options.isKeyEqual === this.m) {
      this.k = transformKey;
    }
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
  clear(): void {
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
        emitter.n("delete", nodes[index]);
      }
    }
  }

  /**
   * Delete the entry for the given `key` in cache.
   */
  delete(key: Parameters<Fn>): boolean {
    const node = this.k ? this.gt(key) : this.g(key);

    if (node) {
      this.d(node);
      this.o && this.o.n("delete", node);

      return true;
    }

    return false;
  }

  /**
   * Get the value in cache based on the given `key`.
   */
  get(key: Parameters<Fn>): ReturnType<Fn> | undefined {
    const node = this.k ? this.gt(key) : this.g(key);

    if (node) {
      node !== this.h && this.u(node);

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
  off<Type extends CacheEventType>(
    type: Type,
    listener: CacheEventListener<Type, Fn>
  ): void {
    this.o && this.o.r(type, listener);
  }

  /**
   * Add the given `listener` for the given `type` of cache event.
   */
  on<Type extends CacheEventType>(
    type: Type,
    listener: CacheEventListener<Type, Fn>
  ): void {
    if (!this.o) {
      this.o = new CacheEventEmitter<Fn>(this);
    }

    this.o.a(type, listener);
  }

  /**
   * Add or update the cache entry for the given `key`.
   */
  set(key: Parameters<Fn>, value: ReturnType<Fn>): void {
    const normalizedKey = this.k ? this.k(key) : key;

    let node = this.g(normalizedKey);

    if (node) {
      node.v = this.p && value !== node.v ? this.w(value) : value;
      node !== this.h && this.u(node);
      this.o && this.o.n("update", node);
    } else {
      node = this.n(normalizedKey, value);

      this.o && this.o.n("add", node);
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
      return this.a(prevKey[0], nextKey[0]);
    }

    for (let index = 0; index < length; ++index) {
      if (!this.a(prevKey[index], nextKey[index])) {
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
      this.o && this.o.n("delete", prevTail, "evicted");
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

    return value.then(
      (value: any) => {
        if (this.o && this.g(key)) {
          this.o.n("update", node, "resolved");
        }

        return value;
      },
      (error: Error) => {
        if (this.g(key)) {
          this.d(node);
          this.o && this.o.n("delete", node, "rejected");
        }

        throw error;
      }
    );
  }
}

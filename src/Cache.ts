import { CacheEventEmitter } from './EventEmitter.js';
import type {
  Arg,
  CacheEntries,
  CacheEntry,
  CacheEventType,
  CacheEventListener,
  CacheNode,
  Key,
  Options,
} from './internalTypes.ts';
import { cloneKey, getDefault, getEntry, isSameValueZero } from './utils.js';

export class Cache<Fn extends (...args: any[]) => any> {
  /**
   * The current size of the populated cache.
   */
  size = 0;

  /**
   * Whether the individual [a]rgument passed is equal to the same argument in order
   * for a key in cache.
   */
  a: (a: Arg, b: Arg) => boolean;
  /**
   * The [h]ead of the cache linked list.
   */
  h: CacheNode<Fn> | undefined;
  /**
   * The transformer for the [k]ey stored in cache.
   */
  k: ((args: IArguments | Key) => Key) | undefined;
  /**
   * Whether the entire key [m]atches an existing key in cache.
   */
  m: (a: Key, b: Key) => boolean;
  /**
   * Event emitter for [o]n [a]dd events.
   */
  oa: CacheEventEmitter<'add', Fn> | undefined;
  /**
   * Event emitter for [o]n [d]elete events.
   */
  od: CacheEventEmitter<'delete', Fn> | undefined;
  /**
   * Event emitter for [o]n [h]it events.
   */
  oh: CacheEventEmitter<'hit', Fn> | undefined;
  /**
   * Event emitter for [o]n [u]pdate events.
   */
  ou: CacheEventEmitter<'update', Fn> | undefined;
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
    const transformKey = getDefault('function', options.transformKey);

    this.a = getDefault('function', options.isArgEqual, isSameValueZero);
    this.m = getDefault('function', options.isKeyEqual, this.e);
    this.p = getDefault('boolean', options.async, false);
    this.s = getDefault('number', options.maxSize, 1);

    if (transformKey || options.isKeyEqual === this.m) {
      this.k = transformKey
        ? (args: IArguments | Key) => transformKey(cloneKey<Fn>(args))
        : cloneKey;
    }
  }

  /**
   * The [key, value] pairs for the existing entries in cache.
   */
  get snapshot(): CacheEntries<Fn> {
    const entries: Array<CacheEntry<Fn>> = [];

    let node = this.h;

    while (node != null) {
      entries.push(getEntry(node));
      node = node.n;
    }

    return entries;
  }

  /**
   * Clear the cache.
   */
  clear(): void {
    this.h = this.t = undefined;
    this.size = 0;
  }

  /**
   * Delete the entry for the given `key` in cache.
   */
  delete(key: Parameters<Fn>): boolean {
    const node = this.k ? this.gt(key) : this.g(key);

    if (node) {
      this.d(node);
      this.od?.n(node);

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
      if (node !== this.h) {
        this.u(node);
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
  off<Type extends CacheEventType>(
    type: Type,
    listener: CacheEventListener<Type, Fn>,
  ): void {
    const emitter = this.go(type);

    if (emitter && !emitter.r(listener)) {
      if (type === 'add') {
        this.oa = undefined;
      } else if (type === 'delete') {
        this.od = undefined;
      } else if (type === 'hit') {
        this.oh = undefined;
      } else if (type === 'update') {
        this.ou = undefined;
      }
    }
  }

  /**
   * Add the given `listener` for the given `type` of cache event.
   */
  on<
    Type extends CacheEventType,
    Listener extends CacheEventListener<Type, Fn>,
  >(type: Type, listener: Listener): Listener {
    let emitter = this.go(type);

    if (!emitter) {
      emitter = new CacheEventEmitter(type, this);

      if (type === 'add') {
        this.oa = emitter as CacheEventEmitter<'add', Fn>;
      } else if (type === 'delete') {
        this.od = emitter as CacheEventEmitter<'delete', Fn>;
      } else if (type === 'hit') {
        this.oh = emitter as CacheEventEmitter<'hit', Fn>;
      } else if (type === 'update') {
        this.ou = emitter as CacheEventEmitter<'update', Fn>;
      }
    }

    emitter.a(listener);

    return listener;
  }

  /**
   * Add or update the cache entry for the given `key`.
   */
  set(key: Parameters<Fn>, value: ReturnType<Fn>): CacheNode<Fn> {
    const normalizedKey = this.k ? this.k(key) : key;

    let node = this.g(normalizedKey);

    if (node) {
      node.v = value;

      if (node !== this.h) {
        this.u(node);
      }

      this.ou?.n(node);
    } else {
      node = this.n(normalizedKey, value);

      this.oa?.n(node);
    }

    return node;
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

    --this.size;
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
   * Method to [g]et the [o]n event emitter for the given `type`.
   */
  go(type: CacheEventType): CacheEventEmitter<CacheEventType, Fn> | undefined {
    if (type === 'add') {
      return this.oa;
    }

    if (type === 'delete') {
      return this.od;
    }

    if (type === 'hit') {
      return this.oh;
    }

    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (type === 'update') {
      return this.ou;
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
      node.v = value.then(
        (value: any) => {
          if (this.ou && this.g(key)) {
            this.ou.n(node, 'resolved')
          }

          return value;
        },
        (error: Error) => {
          if (this.g(key)) {
            this.d(node);

            this.od?.n(node, 'rejected');
          }

          throw error;
        },
      );
    }

    this.h = node;

    if (prevHead) {
      prevHead.p = node;
    } else {
      this.t = node;
    }

    if (++this.size > this.s && prevTail) {
      this.d(prevTail);
      this.od?.n(prevTail, 'evicted');
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
}

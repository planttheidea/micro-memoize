import type {
  Arg,
  CacheEntries,
  CacheEntry,
  CacheEvent,
  CacheEventType,
  CacheEventListener,
  CacheNode,
  EventEmitter,
  Key,
  Options,
} from './internalTypes';
import { cloneKey, getDefault, getEntry, isSameValueZero } from './utils';

export class Cache<Fn extends (...args: any[]) => any> {
  size = 0;

  a: (a: Arg, b: Arg) => boolean;
  h: CacheNode<Fn> | null = null;
  k: ((args: IArguments | Key) => Key) | undefined;
  l: number;
  m: (a: Key, b: Key) => boolean;
  oa: EventEmitter<'add', Fn> | null = null;
  od: EventEmitter<'delete', Fn> | null = null;
  oh: EventEmitter<'hit', Fn> | null = null;
  ou: EventEmitter<'update', Fn> | null = null;
  p: boolean;
  t: CacheNode<Fn> | null = null;

  constructor(options: Options<Fn>) {
    const transformKey = getDefault('function', options.transformKey);

    this.a = getDefault('function', options.isArgEqual, isSameValueZero);
    this.l = getDefault('number', options.maxSize, 1);
    this.m = getDefault('function', options.isKeyEqual, this.e);
    this.p = getDefault('boolean', options.async, false);

    if (transformKey || options.isKeyEqual === this.m) {
      this.k = transformKey
        ? (args: IArguments | Key) => transformKey(cloneKey<Fn>(args))
        : cloneKey;
    }
  }

  clear(): void {
    this.h = this.t = null;
    this.size = 0;
  }

  delete(key: Parameters<Fn>): boolean {
    const node = this.gt(key);

    if (node) {
      this.d(node);
      this.od && this.od.n(node);

      return true;
    }

    return false;
  }

  entries(): CacheEntries<Fn> {
    const entries: Array<CacheEntry<Fn>> = [];

    let node = this.h;

    while (node != null) {
      entries.push(getEntry(node));
      node = node.n;
    }

    return entries;
  }

  get(key: Parameters<Fn>): ReturnType<Fn> | undefined {
    const node = this.gt(key);

    if (node) {
      node !== this.h && this.u(node);

      return node.v;
    }
  }

  has(key: Parameters<Fn>): boolean {
    return !!this.gt(key);
  }

  off<Type extends CacheEventType>(
    type: Type,
    listener: CacheEventListener<Type, Fn>,
  ): void {
    const emitter = this.og(type);

    if (emitter) {
      emitter.r(listener);
      !emitter.s && this.os(type, null);
    }
  }

  on<
    Type extends CacheEventType,
    Listener extends CacheEventListener<Type, Fn>,
  >(type: Type, listener: Listener): Listener {
    let emitter = this.og(type);

    if (!emitter) {
      emitter = this.c(type);
      this.os(type, emitter);
    }

    emitter.a(listener);

    return listener;
  }

  set(key: Parameters<Fn>, value: ReturnType<Fn>): CacheNode<Fn> {
    const normalizedKey = this.k ? this.k(key) : key;

    let node = this.g(normalizedKey);

    if (node) {
      node.v = value;

      node !== this.h && this.u(node);
      this.ou && this.ou.n(node);
    } else {
      node = this.n(normalizedKey, value);

      this.oa && this.oa.n(node);
    }

    return node;
  }

  c<Type extends CacheEventType>(type: Type): EventEmitter<Type, Fn> {
    const listeners: Array<CacheEventListener<Type, Fn>> = [];
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const cache = this;

    let size = 0;

    function a(listener: CacheEventListener<Type, Fn>): void {
      if (listeners.indexOf(listener) === -1) {
        listeners.push(listener);
        ++size;
      }
    }

    function n(node: CacheNode<Fn>, reason?: any): void {
      const entry = getEntry(node);

      for (let index = 0; index < size; ++index) {
        listeners[index]!({
          cache,
          entry,
          reason,
          type,
        } as unknown as CacheEvent<Type, Fn>);
      }
    }

    function r(listener: CacheEventListener<Type, Fn>): void {
      const index = listeners.indexOf(listener);

      if (index !== -1) {
        listeners.splice(index, 1);
        --size;
      }
    }

    return {
      get s() {
        return size;
      },
      a,
      n,
      r,
    };
  }

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

  gt(key: Parameters<Fn>): CacheNode<Fn> | undefined {
    return this.g(this.k ? this.k(key) : key);
  }

  n(key: Key, value: ReturnType<Fn>): CacheNode<Fn> {
    const prevHead = this.h;
    const prevTail = this.t;
    const node = { k: key, n: prevHead, p: null, v: value };

    if (this.p) {
      node.v = value.then(
        (value: any) => {
          this.ou && this.g(key) && this.ou.n(node, 'resolved');

          return value;
        },
        (error: Error) => {
          if (this.g(key)) {
            this.d(node);

            this.od && this.od.n(node, 'rejected');
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

    if (++this.size > this.l && prevTail) {
      this.d(prevTail);
      this.od && this.od.n(prevTail, 'evicted');
    }

    return node;
  }

  og(type: CacheEventType): EventEmitter<CacheEventType, Fn> | null {
    if (type === 'add') {
      return this.oa;
    }

    if (type === 'delete') {
      return this.od;
    }

    if (type === 'hit') {
      return this.oh;
    }

    if (type === 'update') {
      return this.ou;
    }

    return null;
  }

  os(
    type: CacheEventType,
    emitter: EventEmitter<CacheEventType, Fn> | null,
  ): void {
    if (type === 'add') {
      this.oa = emitter;
    } else if (type === 'delete') {
      this.od = emitter;
    } else if (type === 'hit') {
      this.oh = emitter;
    } else if (type === 'update') {
      this.ou = emitter;
    }
  }


  u(node: CacheNode<Fn>): void {
    const next = node.n;
    const prev = node.p;

    if (next) {
      next.p = prev;
    }

    if (prev) {
      prev.n = next;
    }

    this.h!.p = node;
    node.n = this.h;
    node.p = null;
    this.h = node;

    if (node === this.t) {
      this.t = prev;
    }
  }
}

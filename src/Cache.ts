import type {
  Arg,
  Cache as CacheType,
  CacheEntry,
  CacheNode,
  CacheSnapshot,
  Key,
  Options,
  CacheEventType,
  CacheEventListener,
} from '../index.d';
import { EventEmitter } from './EventEmitter';
import { cloneKey, getDefault, getEntry, isSameValueZero } from './utils';

export class Cache<Fn extends (...args: any[]) => any>
  implements CacheType<Fn>
{
  private c: boolean;
  private l: number;
  private p: boolean;

  a: (a: Arg, b: Arg) => boolean;
  h: CacheNode<Fn> | null = null;
  k: ((args: IArguments) => Key) | undefined;
  m: (a: Key, b: Key) => boolean;
  oa: EventEmitter<'add', Fn> | null = null;
  od: EventEmitter<'delete', Fn> | null = null;
  oh: EventEmitter<'hit', Fn> | null = null;
  ou: EventEmitter<'update', Fn> | null = null;
  s = 0;
  t: CacheNode<Fn> | null = null;

  constructor(options: Options<Fn>) {
    const transformKey = getDefault('function', options.transformKey);

    this.a = getDefault('function', options.matchesArg, isSameValueZero);
    this.l = getDefault('number', options.maxSize, 1);
    this.m = getDefault('function', options.matchesKey, this.e);
    this.p = getDefault('boolean', options.async, false);

    this.c = !!transformKey || options.matchesKey === this.m;

    if (this.c) {
      this.k = transformKey
        ? (args: IArguments) => transformKey(cloneKey<Fn>(args))
        : cloneKey;
    }
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
    const emitter = this.og(type);

    if (!emitter) {
      // @ts-expect-error - Narrow typing of map sees listeners differently
      emitter = new EventEmitter<Type, Fn>(type);

      this.os(type, emitter);
    }

    emitter.a(listener);

    return listener;
  }

  snapshot(): CacheSnapshot<Fn> {
    const entries: Array<CacheEntry<Fn>> = [];

    let node = this.h;

    while (node != null) {
      entries.push(getEntry(node));
      node = node.n;
    }

    return { entries, size: this.s };
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

    --this.s;
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
    if (!this.h) {
      return;
    }

    if (this.m(this.h.k, key)) {
      return this.h;
    }

    if (this.h === this.t) {
      return;
    }

    let cached: CacheNode<Fn> | null = this.h.n;

    while (cached) {
      if (this.m(cached.k, key)) {
        this.u(cached);
        return cached;
      }

      cached = cached.n;
    }
  }

  n(key: Key, value: ReturnType<Fn>): CacheNode<Fn> {
    const prevHead = this.h;
    const prevTail = this.t;
    const node = { k: key, n: prevHead, p: null, v: value };

    if (this.p) {
      node.v = value.then(
        (value: any) => {
          this.ou &&
            this.g(node.k) &&
            this.ou.n({
              cache: this,
              entry: getEntry(node),
              reason: 'resolved',
              type: 'update',
            });

          return value;
        },
        (error: Error) => {
          if (this.g(key)) {
            this.d(node);

            this.od &&
              this.od.n({
                cache: this,
                entry: getEntry(node),
                reason: 'rejected',
                type: 'delete',
              });
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

    if (++this.s > this.l && prevTail) {
      this.d(prevTail);

      this.od &&
        this.od.n({
          cache: this,
          entry: getEntry(prevTail),
          reason: 'evicted',
          type: 'delete',
        });
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

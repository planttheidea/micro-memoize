import { Cache } from './Cache';
import {
  CacheEntry,
  CacheEvent,
  CacheEventListener,
  CacheEventType,
  CacheNode,
} from './internalTypes';
import { getEntry } from './utils';

export class CacheEventEmitter<
  Type extends CacheEventType,
  Fn extends (...args: any[]) => any,
> {
  /**
   * The [s]ize of the cache of listeners active for the emitter.
   */
  s: number = 0;

  /**
   * The [c]ache the emitter is associated with.
   */
  private c: Cache<Fn>;
  /**
   * The list of [l]isteners for the given [t]ype.
   */
  private l: Array<CacheEventListener<Type, Fn>> = [];
  /**
   * The [t]ype of event the emitter is associated with.
   */
  private t: Type;

  constructor(type: Type, cache: Cache<Fn>) {
    this.c = cache;
    this.t = type;
  }

  get size() {
    return this.s;
  }

  /**
   * Method to [a]dd a listener for the given cache change event.
   */
  a(listener: CacheEventListener<Type, Fn>): void {
    if (this.l.indexOf(listener) === -1) {
      this.l.push(listener);
      ++this.s;
    }
  }

  /**
   * Method to [n]otify all listeners for the given cache change event.
   */
  n(node: CacheNode<Fn>, reason?: any): void {
    const entry: CacheEntry<Fn> = getEntry(node);

    for (let index = 0; index < this.s; ++index) {
      this.l[index]!({
        cache: this.c,
        entry,
        reason,
        type: this.t,
      } as CacheEvent<Type, Fn>);
    }
  }

  /**
   * Method to [r]emove a listener for the given cache change event.
   */
  r(listener: CacheEventListener<Type, Fn>): boolean {
    const index = this.l.indexOf(listener);

    if (index !== -1) {
      this.l.splice(index, 1);
      --this.s;
    }

    return this.s > 0;
  }
}

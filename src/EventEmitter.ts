import type {
  CacheEvent,
  CacheEventListener,
  CacheEventType,
  EventEmitter,
} from '../index.d';

export function createEventEmitter<
  Type extends CacheEventType,
  Fn extends (...args: any[]) => any,
>(): EventEmitter<Type, Fn> {
  const listeners: Array<CacheEventListener<Type, Fn>> = [];

  return {
    s: 0,

    a(listener: CacheEventListener<Type, Fn>): void {
      if (listeners.indexOf(listener) === -1) {
        listeners.push(listener);
        ++this.s;
      }
    },

    n(event: CacheEvent<Type, Fn>): void {
      for (let index = 0, length = this.s; index < length; ++index) {
        listeners[index]!(event);
      }
    },

    r(listener: CacheEventListener<Type, Fn>): void {
      const index = listeners.indexOf(listener);

      if (index !== -1) {
        listeners.splice(index, 1);
        --this.s;
      }
    },
  };
}

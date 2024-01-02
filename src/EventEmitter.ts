import type {
  CacheEvent,
  CacheEventListener,
  CacheEventType,
  EventEmitter as EventEmitterType,
} from '../index.d';

export class EventEmitter<
  Type extends CacheEventType,
  Fn extends (...args: any[]) => any,
> implements EventEmitterType<Type, Fn>
{
  private l: Array<CacheEventListener<Type, Fn>> = [];

  s = 0;

  a(listener: CacheEventListener<Type, Fn>): void {
    if (this.l.indexOf(listener) === -1) {
      this.l.push(listener);
      ++this.s;
    }
  }

  n(event: CacheEvent<Type, Fn>): void {
    for (let index = 0, length = this.l.length; index < length; ++index) {
      this.l[index]!(event);
    }
  }

  r(listener: CacheEventListener<Type, Fn>): void {
    const index = this.l.indexOf(listener);

    if (index !== -1) {
      this.l.splice(index, 1);
      --this.s;
    }
  }
}

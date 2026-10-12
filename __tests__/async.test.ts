import Bluebird from 'bluebird';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { memoize } from '../src/index.js';
import type { Memoized, Options } from '../src/internalTypes.js';

test('async caches support thenables that resolve synchronously', () => {
  const thenable = {
    then(resolve: (value: number) => number) {
      return resolve(1);
    },
  } as unknown as Promise<number>;
  const memoized = memoize(() => thenable, { async: true });
  expect(memoized()).toBe(1);
  expect(memoized.cache.has([])).toBe(true);
});

test('a replaced promise does not delete the current cache value when it rejects', async () => {
  let reject!: (reason: Error) => void;
  const pending = new Promise<number>((_, rejectPromise) => {
    reject = rejectPromise;
  });
  const memoized = memoize(() => pending, { async: true });
  const previous = memoized();
  const replacement = Promise.resolve(2);
  memoized.cache.set([], replacement);
  const current = memoized();
  const error = new Error('previous request failed');
  reject(error);
  await expect(previous).rejects.toBe(error);
  expect(memoized.cache.has([])).toBe(true);
  expect(memoized()).toBe(current);
  await expect(current).resolves.toBe(2);
});

test('a replaced promise does not report the current value as resolved', async () => {
  let resolve!: (value: number) => void;
  const pending = new Promise<number>((resolvePromise) => {
    resolve = resolvePromise;
  });
  const memoized = memoize(() => pending, { async: true });
  const previous = memoized();
  memoized.cache.set([], new Promise<number>(() => {}));
  const update = vi.fn();
  memoized.cache.on('update', update);
  resolve(1);
  await expect(previous).resolves.toBe(1);
  expect(update).not.toHaveBeenCalled();
});

function createMethod(type: string, method: 'resolve' | 'reject', PromiseLibrary: PromiseConstructor) {
  if (method === 'reject') {
    return function (number: number, otherNumber: number) {
      return PromiseLibrary.reject(new Error(`rejected ${(number * otherNumber).toString()}`));
    };
  }

  return function (number: number, otherNumber: number) {
    return PromiseLibrary.resolve(number * otherNumber);
  };
}

const bluebirdMemoizedResolve = memoize(
  createMethod('bluebird', 'resolve', Bluebird as unknown as PromiseConstructor),
  { async: true, statsName: 'bluebird (reject)' },
);
const bluebirdMemoizedReject = memoize(createMethod('bluebird', 'reject', Bluebird as unknown as PromiseConstructor), {
  async: true,
  statsName: 'bluebird (reject)',
});
const bluebirdMemoizedExpiring = memoize(createMethod('native', 'resolve', Bluebird as unknown as PromiseConstructor), {
  async: true,
  expires: 150,
  statsName: 'bluebird (expiring)',
});

const bluebirdOnUpdateSpy = vi.fn();
bluebirdMemoizedExpiring.cache.on('update', bluebirdOnUpdateSpy);

const bluebirdOnExpireSpy = vi.fn();
bluebirdMemoizedExpiring.cache.on('delete', (event) => {
  if (event.reason === 'expired') {
    bluebirdOnExpireSpy(event);
  }
});

const nativeMemoizedResolve = memoize(createMethod('native', 'resolve', Promise), { async: true, statsName: 'native' });
const nativeMemoizedReject = memoize(createMethod('native', 'reject', Promise), {
  async: true,
  statsName: 'native (reject)',
});
const nativeMemoizedExpiring = memoize(createMethod('native', 'resolve', Promise), {
  async: true,
  expires: 150,
  statsName: 'native (expiring)',
});

const nativeOnUpdateSpy = vi.fn();
nativeMemoizedExpiring.cache.on('update', nativeOnUpdateSpy);

const nativeOnExpireSpy = vi.fn();
nativeMemoizedExpiring.cache.on('delete', (event) => {
  if (event.reason === 'expired') {
    nativeOnExpireSpy(event);
  }
});

function testItem<Fn extends (...args: any[]) => any>(
  key: Parameters<Fn>,
  method: Memoized<Fn, Options<Fn>>,
  Constructor: any,
) {
  const [number, otherNumber] = key;

  return method(...key).then((result: number) => {
    expect(method.cache.g(key)?.v).toBeInstanceOf(Constructor);
    expect(method.cache.g(key.slice().reverse() as Parameters<Fn>)).toBe(undefined);

    expect(result).toEqual(number * otherNumber);
  });
}

const TYPES = {
  bluebird: Bluebird,
  native: Promise,
};

const METHODS = {
  bluebird: {
    resolve: bluebirdMemoizedResolve,
    reject: bluebirdMemoizedReject,
    expiring: bluebirdMemoizedExpiring,
  },
  native: {
    resolve: nativeMemoizedResolve,
    reject: nativeMemoizedReject,
    expiring: nativeMemoizedExpiring,
  },
};

afterEach(() => {
  vi.clearAllMocks();
});

describe.for([
  {
    name: 'native',
    onExpire: nativeOnExpireSpy,
    onUpdate: nativeOnUpdateSpy,
  },
  {
    name: 'bluebird',
    onExpire: bluebirdOnExpireSpy,
    onUpdate: bluebirdOnUpdateSpy,
  },
] as const)('$name', ({ name, onExpire, onUpdate }) => {
  const Constructor = TYPES[name];

  test.each([{ type: 'resolve' }, { type: 'reject' }, { type: 'expiring' }] as const)(
    'handles $type',
    async ({ type }) => {
      const method = METHODS[name][type];

      method.cache.clear();

      try {
        await testItem([6, 9], method, Constructor);

        if (type === 'reject') {
          throw new Error(`${type} should have rejected`);
        }
      } catch (error) {
        if (type !== 'reject') {
          throw error;
        }
      }

      if (type === 'expiring') {
        expect(onUpdate).toHaveBeenCalledWith({
          cache: method.cache,
          key: [6, 9],
          reason: 'resolved',
          type: 'update',
          value: expect.any(Constructor),
        });

        await new Promise((resolve) => setTimeout(resolve, 200)).then(() => {
          expect(onExpire).toHaveBeenCalledWith({
            cache: method.cache,
            key: [6, 9],
            reason: 'expired',
            type: 'delete',
            value: expect.any(Constructor),
          });
        });
      }
    },
  );
});

test('non-promise values are handled safely', () => {
  const fn = (one: string, two: string) => [one, two];
  const memoized = memoize(fn, { async: true });

  const result = memoized('foo', 'bar');

  expect(result).toEqual(['foo', 'bar']);
});

test('removed entries do not fire events', () => {
  const { promise, resolve } = Promise.withResolvers();
  const fn = async () => {
    return await promise;
  };

  const memoized = memoize(fn, { async: true });

  const onHitSpy = vi.fn();
  memoized.cache.on('hit', onHitSpy);

  const onDeleteSpy = vi.fn();
  memoized.cache.on('delete', onDeleteSpy);

  memoized();

  expect(memoized.cache.get([])).toBeInstanceOf(Promise);
  expect(onHitSpy).toHaveBeenCalled();

  onHitSpy.mockClear();

  memoized.cache.delete([]);

  expect(onDeleteSpy).toHaveBeenCalled();

  resolve('foo');

  expect(onHitSpy).not.toHaveBeenCalled();
});

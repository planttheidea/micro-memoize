import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { memoize } from '../src/index.js';

function method(one: string, two: string) {
  return [one, two];
}

const foo = 'foo';
const bar = 'bar';

test('removes the item from cache after the time passed', async () => {
  const memoized = memoize(method, { expires: 100 });
  const onExpire = vi.fn();

  memoized.cache.on('delete', onExpire);

  memoized(foo, bar);

  expect(memoized.cache.has([foo, bar])).toBe(true);
  expect(onExpire).not.toHaveBeenCalled();

  await new Promise((resolve) => setTimeout(resolve, 150));

  expect(memoized.cache.has([foo, bar])).toBe(false);
  expect(onExpire).toHaveBeenCalled();
});

test('updates the expiration when called and cache is hit via option', async () => {
  const withUpdateExpire = memoize(method, {
    expires: { after: 100, update: true },
  });

  withUpdateExpire(foo, bar);

  setTimeout(() => {
    expect(withUpdateExpire.cache.has([foo, bar])).toBe(true);
  }, 100);

  await new Promise((resolve) => setTimeout(resolve, 70));

  withUpdateExpire(foo, bar);

  expect(withUpdateExpire.cache.has([foo, bar])).toBe(true);

  await new Promise((resolve) => setTimeout(resolve, 150));

  expect(withUpdateExpire.cache.has([foo, bar])).toBe(false);
});

test('updates the expiration when called and cache is hit', async () => {
  const withUpdateExpire = memoize(method, {
    expires: { after: 100, update: true },
  });

  withUpdateExpire(foo, bar);

  setTimeout(() => {
    expect(withUpdateExpire.cache.has([foo, bar])).toBe(true);
  }, 100);

  await new Promise((resolve) => setTimeout(resolve, 70));

  withUpdateExpire(foo, bar);

  expect(withUpdateExpire.cache.has([foo, bar])).toBe(true);

  await new Promise((resolve) => setTimeout(resolve, 150));

  expect(withUpdateExpire.cache.has([foo, bar])).toBe(false);
});

test('updates the expiration timing via option and calls the onExpire method when the item is removed from cache', async () => {
  const withExpireOptions = memoize(method, {
    expires: { after: 100, update: true },
  });
  const onExpire = vi.fn();

  withExpireOptions.cache.on('delete', onExpire);

  withExpireOptions(foo, bar);
  expect(onExpire).not.toHaveBeenCalled();

  setTimeout(() => {
    expect(onExpire).not.toHaveBeenCalled();
    expect(withExpireOptions.cache.has([foo, bar])).toBe(true);
  }, 100);

  await new Promise((resolve) => setTimeout(resolve, 70));

  withExpireOptions(foo, bar);
  expect(onExpire).not.toHaveBeenCalled();

  await new Promise((resolve) => setTimeout(resolve, 150));

  expect(withExpireOptions.cache.has([foo, bar])).toBe(false);
  expect(onExpire).toHaveBeenCalledTimes(1);
});

test('updates the expiration timing and calls the onExpire method when the item is removed from cache', async () => {
  const withExpireOptions = memoize(method, {
    expires: { after: 100, update: true },
  });
  const onExpire = vi.fn();

  withExpireOptions.cache.on('delete', onExpire);

  withExpireOptions(foo, bar);
  expect(onExpire).not.toHaveBeenCalled();

  setTimeout(() => {
    expect(onExpire).not.toHaveBeenCalled();
    expect(withExpireOptions.cache.has([foo, bar])).toBe(true);
  }, 100);

  await new Promise((resolve) => setTimeout(resolve, 70));

  withExpireOptions(foo, bar);
  expect(onExpire).not.toHaveBeenCalled();

  await new Promise((resolve) => setTimeout(resolve, 150));

  expect(withExpireOptions.cache.has([foo, bar])).toBe(false);
  expect(onExpire).toHaveBeenCalledTimes(1);
});

test('allows the expiration to be re-established if `shouldRemove` returns false', async () => {
  const shouldRemove = vi.fn().mockReturnValueOnce(false).mockReturnValue(true);
  const withShouldRemove = memoize(method, {
    expires: { after: 100, shouldRemove },
  });

  withShouldRemove(foo, bar);

  expect(withShouldRemove.cache.has([foo, bar])).toBe(true);
  expect(shouldRemove).not.toHaveBeenCalled();

  await new Promise((resolve) => setTimeout(resolve, 110));

  expect(withShouldRemove.cache.has([foo, bar])).toBe(true);
  expect(shouldRemove).toHaveBeenCalledTimes(1);

  await new Promise((resolve) => setTimeout(resolve, 110));

  expect(withShouldRemove.cache.has([foo, bar])).toBe(false);
  expect(shouldRemove).toHaveBeenCalledTimes(2);
});

test('notifies of cache update when expiration re-established if update listener', async () => {
  const shouldRemove = vi.fn().mockReturnValueOnce(false).mockReturnValue(true);
  const withShouldRemove = memoize(method, {
    expires: { after: 100, shouldRemove },
  });

  const onUpdate = vi.fn();
  withShouldRemove.cache.on('update', onUpdate);

  withShouldRemove(foo, bar);

  expect(withShouldRemove.cache.has([foo, bar])).toBe(true);
  expect(shouldRemove).not.toHaveBeenCalled();

  await new Promise((resolve) => setTimeout(resolve, 110));

  expect(withShouldRemove.cache.has([foo, bar])).toBe(true);
  expect(shouldRemove).toHaveBeenCalledWith([foo, bar], [foo, bar], 100, withShouldRemove.cache);

  await new Promise((resolve) => setTimeout(resolve, 110));

  expect(withShouldRemove.cache.has([foo, bar])).toBe(false);
  expect(shouldRemove).toHaveBeenNthCalledWith(2, [foo, bar], [foo, bar], 100, withShouldRemove.cache);

  expect(onUpdate).toHaveBeenCalledWith({
    cache: withShouldRemove.cache,
    key: [foo, bar],
    reason: 'expiration reset',
    type: 'update',
    value: [foo, bar],
  });
});

test('ignores cancellation when `shouldPersist` returns true', async () => {
  const shouldPersist = vi.fn().mockReturnValue(true);
  const withShouldPersist = memoize(method, {
    expires: { after: 100, shouldPersist },
  });

  const deleteSpy = vi.fn();
  withShouldPersist.cache.on('delete', deleteSpy);

  withShouldPersist(foo, bar);

  await new Promise((resolve) => setTimeout(resolve, 500));

  expect(deleteSpy).not.toHaveBeenCalled();
});

test('throws an error when invalid time is passed', () => {
  const throws = memoize(method, {
    expires: Infinity,
  });

  expect(() => throws('foo', 'bar')).toThrow(
    'The expiration time must be a finite, non-negative number; received Infinity',
  );
});

test('does nothing on timeout if the node cannot be found in cache', async () => {
  const memoized = memoize(method, { expires: 100 });
  const onExpire = vi.fn();

  memoized.cache.on('delete', onExpire);

  memoized(foo, bar);

  expect(memoized.cache.has([foo, bar])).toBe(true);
  expect(memoized.expirationManager?.size).toBe(1);

  // Forcibly clear the cache in a terrible hacky way
  memoized.cache.h = memoized.cache.t = undefined;

  expect(memoized.cache.has([foo, bar])).toBe(false);

  await new Promise((resolve) => setTimeout(resolve, 150));

  expect(memoized.cache.has([foo, bar])).toBe(false);
  expect(onExpire).not.toHaveBeenCalled();
});

test('updates the expiration when the async method resolves', async () => {
  const { promise, resolve } = Promise.withResolvers();
  const fn = async () => {
    return await promise;
  };

  const memoized = memoize(fn, {
    async: true,
    expires: { after: 200, update: true },
  });

  const onHitSpy = vi.fn();
  memoized.cache.on('hit', onHitSpy);

  const onUpdateSpy = vi.fn();
  memoized.cache.on('update', onUpdateSpy);

  const onDeleteSpy = vi.fn();
  memoized.cache.on('delete', onDeleteSpy);

  memoized();

  await new Promise((resolve) => setTimeout(resolve, 100));

  resolve('foo');

  // wait a tick to ensure promises resolve
  await new Promise((resolve) => setTimeout(resolve, 0));

  // update has been called from resolution
  expect(onUpdateSpy).toHaveBeenCalled();
  // hit has not been called to update expiration normally
  expect(onHitSpy).not.toHaveBeenCalled();
  // no expiration has happened
  expect(onDeleteSpy).not.toHaveBeenCalled();

  await new Promise((resolve) => setTimeout(resolve, 150));

  expect(onDeleteSpy).not.toHaveBeenCalled();

  await new Promise((resolve) => setTimeout(resolve, 100));

  // Now the updated expiration has happened.
  expect(onDeleteSpy).toHaveBeenCalledWith(expect.objectContaining({ reason: 'expired' }));
});

describe('expiration across async resolutions', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  test.each([
    ['first', 'second'],
    ['second', 'first'],
  ])('starts each countdown when %s then %s resolves', async (first, second) => {
    const requests = new Map([
      ['first', Promise.withResolvers<string>()],
      ['second', Promise.withResolvers<string>()],
    ]);
    const memoized = memoize((key: string) => requests.get(key)!.promise, {
      async: true,
      maxSize: 2,
      expires: { after: 100, update: true },
    });
    const firstValue = memoized(first);
    const secondValue = memoized(second);

    vi.advanceTimersByTime(20);
    requests.get(first)!.resolve(first);
    await expect(firstValue).resolves.toBe(first);
    vi.advanceTimersByTime(30);
    requests.get(second)!.resolve(second);
    await expect(secondValue).resolves.toBe(second);

    vi.advanceTimersByTime(51);
    expect(memoized.cache.has([first])).toBe(true);
    expect(memoized.cache.has([second])).toBe(true);
    vi.advanceTimersByTime(20);
    expect(memoized.cache.has([first])).toBe(false);
    expect(memoized.cache.has([second])).toBe(true);
    vi.advanceTimersByTime(30);
    expect(memoized.cache.has([second])).toBe(false);
  });

  test.each(['clear', 'delete', 'evict', 'expire'] as const)(
    'updates the countdown after a resolved entry is removed by %s',
    async (removal) => {
      let request = Promise.withResolvers<string>();
      const memoized = memoize((_key: string) => request.promise, {
        async: true,
        expires: { after: 100, update: true },
      });
      const firstValue = memoized('key');
      vi.advanceTimersByTime(20);
      request.resolve('first');
      await expect(firstValue).resolves.toBe('first');

      if (removal === 'clear') {
        memoized.cache.clear();
      } else if (removal === 'delete') {
        memoized.cache.delete(['key']);
      } else if (removal === 'evict') {
        memoized('other');
      } else {
        vi.advanceTimersByTime(101);
      }

      expect(memoized.cache.has(['key'])).toBe(false);
      request = Promise.withResolvers<string>();
      const secondValue = memoized('key');
      vi.advanceTimersByTime(40);
      request.resolve('second');
      await expect(secondValue).resolves.toBe('second');

      vi.advanceTimersByTime(61);
      expect(memoized.cache.has(['key'])).toBe(true);
      vi.advanceTimersByTime(40);
      expect(memoized.cache.has(['key'])).toBe(false);
    },
  );

  test.each(['clear', 'delete', 'evict', 'expire'] as const)(
    'does not restore an entry that resolves after %s',
    async (removal) => {
      let request = Promise.withResolvers<string>();
      const memoized = memoize((_key: string) => request.promise, {
        async: true,
        expires: { after: 100, update: true },
      });
      const firstValue = memoized('first');
      request.resolve('first');
      await firstValue;

      request = Promise.withResolvers<string>();
      const pending = memoized('pending');
      if (removal === 'clear') {
        memoized.cache.clear();
      } else if (removal === 'delete') {
        memoized.cache.delete(['pending']);
      } else if (removal === 'evict') {
        memoized('replacement');
      } else {
        vi.advanceTimersByTime(101);
      }

      request.resolve('late');
      await expect(pending).resolves.toBe('late');
      expect(memoized.cache.has(['pending'])).toBe(false);
      vi.advanceTimersByTime(101);
      expect(memoized.cache.has(['pending'])).toBe(false);
    },
  );

  test.each([
    { async: false, update: true },
    { async: true, update: false },
  ])('retains insertion-based expiration for %j', async (options) => {
    const request = Promise.withResolvers<string>();
    const memoized = memoize(() => request.promise, {
      async: options.async,
      expires: { after: 100, update: options.update },
    });
    const value = memoized();
    vi.advanceTimersByTime(40);
    request.resolve('value');
    await value;
    vi.advanceTimersByTime(61);
    expect(memoized.cache.has([])).toBe(false);
  });
});

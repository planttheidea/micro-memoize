// src
import Cache from '../src/Cache';
import { isSameValueZero } from '../src/utils';

const DEFAULT_OPTIONS = {
  isEqual: isSameValueZero,
  isPromise: false,
  maxSize: 1,
};

describe('constructor', () => {
  it('creates the correct cache based on options having a default maxSize', () => {
    const options = { ...DEFAULT_OPTIONS };

    const cache = new Cache(options);

    expect(cache.keys).toEqual([]);
    expect(cache.values).toEqual([]);
    expect(cache.options).toBe(options);

    expect(cache.getKeyIndex).toBe(Cache.prototype._getKeyIndexForSingleCache);
  });

  it('creates the correct cache based on options having a larger maxSize', () => {
    const options = {
      ...DEFAULT_OPTIONS,
      maxSize: 3,
    };

    const cache = new Cache(options);

    expect(cache.keys).toEqual([]);
    expect(cache.values).toEqual([]);
    expect(cache.options).toBe(options);

    expect(cache.getKeyIndex).toBe(
      Cache.prototype._getKeyIndexForMultipleCache,
    );
  });

  it('creates the correct cache based on options having isMatchingKey as an option', () => {
    const options = {
      ...DEFAULT_OPTIONS,
      isMatchingKey(a: any[], b: any[]) {
        return a === b;
      },
    };

    const cache = new Cache(options);

    expect(cache.keys).toEqual([]);
    expect(cache.values).toEqual([]);
    expect(cache.options).toBe(options);

    expect(cache.getKeyIndex).toBe(Cache.prototype._getKeyIndexByMatchingKey);
  });
});

describe('_updateAsync', () => {
  it('will fire cache callbacks if resolved', async () => {
    const timeout = 200;

    const fn = async () => {
      await new Promise((resolve: Function) => {
        setTimeout(resolve, timeout);
      });

      return 'resolved';
    };
    const key = ['foo'];
    const memoized = () => {};

    const value = fn();

    const cache = new Cache({
      ...DEFAULT_OPTIONS,
      isPromise: true,
      onCacheChange: jest.fn(),
      onCacheHit: jest.fn(),
    });

    cache.keys = [key];
    cache.values = [value];

    cache._updateAsync(memoized);

    // this is just to prevent the unhandled rejection noise
    cache.values[0].catch(() => {});

    expect(cache.keys.length).toEqual(1);
    expect(cache.values.length).toEqual(1);
    expect(cache.values[0]).toEqual(value);

    await new Promise((resolve: Function) => {
      setTimeout(resolve, timeout + 50);
    });

    expect(cache.keys.length).toEqual(1);
    expect(cache.values.length).toEqual(1);
    expect(cache.values[0]).toEqual(value);

    expect(cache.options.onCacheHit).toHaveBeenCalledTimes(1);
    expect(cache.options.onCacheHit).toHaveBeenCalledWith(
      cache,
      cache.options,
      memoized,
    );

    expect(cache.options.onCacheChange).toHaveBeenCalledTimes(1);
    expect(cache.options.onCacheChange).toHaveBeenCalledWith(
      cache,
      cache.options,
      memoized,
    );
  });

  it('will remove the key from cache when the promise is rejected', async () => {
    const timeout = 200;

    const fn = async () => {
      await new Promise((resolve: Function, reject: Function) => {
        setTimeout(() => reject(new Error('boom')), timeout);
      });
    };
    const key = ['foo'];
    const value = fn();

    const memoized = () => {};

    const cache = new Cache({
      ...DEFAULT_OPTIONS,
      isPromise: true,
      onCacheChange: jest.fn(),
      onCacheHit: jest.fn(),
    });

    cache.keys = [key];
    cache.values = [value];

    cache._updateAsync(memoized);

    const catcher = jest.fn();

    cache.values[0].catch(catcher);

    expect(cache.keys.length).toEqual(1);
    expect(cache.values.length).toEqual(1);
    expect(cache.values[0]).toEqual(value);

    await new Promise((resolve: Function) => {
      setTimeout(resolve, timeout + 50);
    });

    expect(catcher).toHaveBeenCalledTimes(1);

    const expectedCache = new Cache({
      ...DEFAULT_OPTIONS,
      isPromise: true,
      onCacheChange: cache.options.onCacheChange,
      onCacheHit: cache.options.onCacheHit,
    });

    expect(cache).toEqual(expectedCache);

    expect(cache.options.onCacheHit).toHaveBeenCalledTimes(0);
    expect(cache.options.onCacheChange).toHaveBeenCalledTimes(0);
  });

  it('will not remove the key from cache when the promise is rejected but the key no longer exists', async () => {
    const timeout = 200;

    const fn = async () => {
      await new Promise((resolve: Function, reject: Function) => {
        setTimeout(() => reject(new Error('boom')), timeout);
      });
    };
    const key = ['foo'];
    const value = fn();

    const memoized = () => {};

    const cache = new Cache({
      ...DEFAULT_OPTIONS,
      isPromise: true,
      onCacheChange: jest.fn(),
      onCacheHit: jest.fn(),
    });

    cache.keys = [key];
    cache.values = [value];

    cache._updateAsync(memoized);

    const newValue = cache.values[0];

    const catcher = jest.fn();

    newValue.catch(catcher);

    expect(cache.keys.length).toEqual(1);
    expect(cache.values.length).toEqual(1);
    expect(cache.values[0]).toEqual(value);

    cache.keys = [['bar']];
    // @ts-ignore
    cache.values = [Promise.resolve('baz')];

    await new Promise((resolve: Function) => {
      setTimeout(resolve, timeout + 50);
    });

    expect(catcher).toHaveBeenCalledTimes(1);

    expect(cache.options.onCacheHit).toHaveBeenCalledTimes(0);
    expect(cache.options.onCacheChange).toHaveBeenCalledTimes(0);
  });
});

describe('getKeyIndex', () => {
  it('will return the index of the match found when maxSize is 1', () => {
    const cache = new Cache(DEFAULT_OPTIONS);

    cache.keys = [['key']];
    cache.values = ['value'];

    const keyToMatch = ['key'];

    const result = cache.getKeyIndex(keyToMatch);

    expect(result).toEqual(0);
  });

  it('will return -1 if the key length is different when maxSize is 1', () => {
    const cache = new Cache(DEFAULT_OPTIONS);

    cache.keys = [['key']];
    cache.values = ['value'];

    const keyToMatch = ['some', 'other key'];

    const result = cache.getKeyIndex(keyToMatch);

    expect(result).toEqual(-1);
  });

  it('will return -1 if no match found when maxSize is 1', () => {
    const cache = new Cache(DEFAULT_OPTIONS);

    cache.keys = [['key']];
    cache.values = ['value'];

    const keyToMatch = ['other key'];

    const result = cache.getKeyIndex(keyToMatch);

    expect(result).toEqual(-1);
  });

  it('will return the index of the match found when maxSize is >1', () => {
    const cache = new Cache({ ...DEFAULT_OPTIONS, maxSize: 2 });

    cache.keys = [['other key'], ['key']];
    cache.values = ['value'];

    const keyToMatch = ['key'];

    const result = cache.getKeyIndex(keyToMatch);

    expect(result).toEqual(1);
  });

  it('will return -1 if the key length is different when maxSize is >1', () => {
    const cache = new Cache({ ...DEFAULT_OPTIONS, maxSize: 2 });

    cache.keys = [['other key'], ['key']];
    cache.values = ['value'];

    const keyToMatch = ['some', 'other key'];

    const result = cache.getKeyIndex(keyToMatch);

    expect(result).toEqual(-1);
  });

  it('will return -1 if no match found when maxSize is >1', () => {
    const cache = new Cache({ ...DEFAULT_OPTIONS, maxSize: 2 });

    cache.keys = [['other key'], ['key']];
    cache.values = ['value'];

    const keyToMatch = ['not present key'];

    const result = cache.getKeyIndex(keyToMatch);

    expect(result).toEqual(-1);
  });

  it('will use the isMatchingKey method is passed', () => {
    const isMatchingKey = (o1: any, o2: any) => {
      const existingKey = o1[0];
      const key = o2[0];

      return (
        existingKey.hasOwnProperty('foo') &&
        key.hasOwnProperty('foo') &&
        (existingKey.bar === 'bar' || key.bar === 'baz')
      );
    };

    const cache = new Cache({ ...DEFAULT_OPTIONS, isMatchingKey });

    cache.keys = [
      [
        {
          bar: 'bar',
          foo: 'foo',
        },
      ],
    ];

    const keyToMatch = [
      {
        bar: 'baz',
        foo: 'bar',
      },
    ];

    const result = cache.getKeyIndex(keyToMatch);

    expect(result).toEqual(0);
  });

  it('will return -1 if the isMatchingKey method is passed and no match is found', () => {
    const isMatchingKey = (o1: any, o2: any) => {
      const existingKey = o1[0];
      const key = o2[0];

      return (
        existingKey.hasOwnProperty('foo') &&
        key.hasOwnProperty('foo') &&
        (existingKey.bar === 'bar' || key.bar === 'baz')
      );
    };

    const cache = new Cache({ ...DEFAULT_OPTIONS, isMatchingKey });

    cache.keys = [
      [
        {
          bar: 'baz',
          baz: 'quz',
        },
      ],
    ];

    const keyToMatch = [
      {
        bar: 'baz',
        foo: 'bar',
      },
    ];

    const result = cache.getKeyIndex(keyToMatch);

    expect(result).toEqual(-1);
  });

  it('will use the isMatchingKey method is passed and maxSize is >1', () => {
    const isMatchingKey = (o1: any, o2: any) => {
      const existingKey = o1[0];
      const key = o2[0];

      return (
        existingKey.hasOwnProperty('foo') &&
        key.hasOwnProperty('foo') &&
        (existingKey.bar === 'bar' || key.bar === 'baz')
      );
    };

    const cache = new Cache({ ...DEFAULT_OPTIONS, isMatchingKey, maxSize: 2 });

    cache.keys = [
      [
        {
          bar: 'baz',
          baz: 'quz',
        },
      ],
      [
        {
          bar: 'bar',
          foo: 'foo',
        },
      ],
    ];

    const keyToMatch = [
      {
        bar: 'baz',
        foo: 'bar',
      },
    ];

    const result = cache.getKeyIndex(keyToMatch);

    expect(result).toEqual(1);
  });

  it('will return -1 if the isMatchingKey method is passed and no match is found and maxSize is >1', () => {
    const isMatchingKey = (o1: any, o2: any) => {
      const existingKey = o1[0];
      const key = o2[0];

      return (
        existingKey.hasOwnProperty('foo') &&
        key.hasOwnProperty('foo') &&
        existingKey.bar === key.bar
      );
    };

    const cache = new Cache({ ...DEFAULT_OPTIONS, isMatchingKey, maxSize: 2 });

    cache.keys = [
      [
        {
          bar: 'baz',
          baz: 'quz',
        },
      ],
      [
        {
          bar: 'quz',
          foo: 'foo',
        },
      ],
    ];

    const keyToMatch = [
      {
        bar: 'baz',
        foo: 'bar',
      },
    ];

    const result = cache.getKeyIndex(keyToMatch);

    expect(result).toEqual(-1);
  });
});

describe('orderByLru', () => {
  it('will do nothing if the itemIndex is 0', () => {
    const cache = new Cache({ ...DEFAULT_OPTIONS, maxSize: 3 });

    cache.keys = [['first'], ['second'], ['third']];
    cache.values = ['first', 'second', 'third'];

    const itemIndex = 0;
    const key = cache.keys[itemIndex];
    const value = cache.values[itemIndex];

    cache.orderByLru(key, value, itemIndex);

    expect(cache).toEqual({
      ...cache,
      keys: [['first'], ['second'], ['third']],
      values: ['first', 'second', 'third'],
    });
  });

  it('will place the itemIndex first in order when non-zero', () => {
    const cache = new Cache({ ...DEFAULT_OPTIONS, maxSize: 3 });

    cache.keys = [['first'], ['second'], ['third']];
    cache.values = ['first', 'second', 'third'];

    const itemIndex = 1;
    const key = cache.keys[itemIndex];
    const value = cache.values[itemIndex];

    cache.orderByLru(key, value, itemIndex);

    expect(cache).toEqual({
      ...cache,
      keys: [['second'], ['first'], ['third']],
      values: ['second', 'first', 'third'],
    });
  });

  it('will add the new item to the array when the itemIndex is the array length', () => {
    const cache = new Cache({ ...DEFAULT_OPTIONS, maxSize: 4 });

    cache.keys = [['first'], ['second'], ['third']];
    cache.values = ['first', 'second', 'third'];

    const itemIndex = cache.keys.length;
    const key = ['key'];
    const value = 'new';

    cache.orderByLru(key, value, itemIndex);

    expect(cache).toEqual({
      ...cache,
      keys: [key, ['first'], ['second'], ['third']],
      values: [value, 'first', 'second', 'third'],
    });
  });
});

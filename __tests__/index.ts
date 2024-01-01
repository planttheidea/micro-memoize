import { deepEqual } from 'fast-equals';
import memoize from '../src';

const has = (object: any, property: string) =>
  Object.prototype.hasOwnProperty.call(object, property);

describe('memoize', () => {
  it('will return the memoized function', () => {
    let callCount = 0;

    const fn = (one: any, two: any) => {
      callCount++;

      return {
        one,
        two,
      };
    };

    const memoized = memoize(fn);

    expect(memoized.cache.snapshot()).toEqual({
      entries: [],
      size: 0,
    });

    expect(memoized.isMemoized).toEqual(true);

    expect(memoized.options).toEqual({});

    new Array(1000).fill('z').forEach(() => {
      const result = memoized('one', 'two');

      expect(result).toEqual({
        one: 'one',
        two: 'two',
      });
    });

    expect(callCount).toEqual(1);

    expect(memoized.cache.snapshot()).toEqual({
      entries: [{ key: ['one', 'two'], value: { one: 'one', two: 'two' } }],
      size: 1,
    });
  });

  it('will return the memoized function that can have multiple cached key => value pairs', () => {
    let callCount = 0;

    const fn = (one: any, two: any) => {
      callCount++;

      return {
        one,
        two,
      };
    };
    const maxSize = 3;

    const memoized = memoize(fn, { maxSize });

    expect(memoized.cache.snapshot()).toEqual({
      entries: [],
      size: 0,
    });

    expect(memoized.isMemoized).toEqual(true);

    expect(memoized.options.maxSize).toEqual(maxSize);

    expect(memoized('one', 'two')).toEqual({
      one: 'one',
      two: 'two',
    });
    expect(memoized('two', 'three')).toEqual({
      one: 'two',
      two: 'three',
    });
    expect(memoized('three', 'four')).toEqual({
      one: 'three',
      two: 'four',
    });
    expect(memoized('four', 'five')).toEqual({
      one: 'four',
      two: 'five',
    });
    expect(memoized('two', 'three')).toEqual({
      one: 'two',
      two: 'three',
    });
    expect(memoized('three', 'four')).toEqual({
      one: 'three',
      two: 'four',
    });

    expect(callCount).toEqual(4);

    expect(memoized.cache.snapshot()).toEqual({
      entries: [
        { key: ['three', 'four'], value: { one: 'three', two: 'four' } },
        { key: ['two', 'three'], value: { one: 'two', two: 'three' } },
        { key: ['four', 'five'], value: { one: 'four', two: 'five' } },
      ],
      size: 3,
    });
  });

  it('will return the memoized function that will use the custom matchesArg method', () => {
    let callCount = 0;

    const fn = (one: any, two: any) => {
      callCount++;

      return {
        one,
        two,
      };
    };

    const memoized = memoize(fn, { matchesArg: deepEqual });

    expect(memoized.options.matchesArg).toBe(deepEqual);

    expect(
      memoized(
        { deep: { value: 'value' } },
        { other: { deep: { value: 'value' } } },
      ),
    ).toEqual({
      one: { deep: { value: 'value' } },
      two: { other: { deep: { value: 'value' } } },
    });

    expect(
      memoized(
        { deep: { value: 'value' } },
        { other: { deep: { value: 'value' } } },
      ),
    ).toEqual({
      one: { deep: { value: 'value' } },
      two: { other: { deep: { value: 'value' } } },
    });

    expect(callCount).toEqual(1);

    expect(memoized.cache.snapshot()).toEqual({
      entries: [
        {
          key: [
            { deep: { value: 'value' } },
            { other: { deep: { value: 'value' } } },
          ],
          value: {
            one: { deep: { value: 'value' } },
            two: { other: { deep: { value: 'value' } } },
          },
        },
      ],
      size: 1,
    });
  });

  it('will return the memoized function that will use the transformKey method', () => {
    let callCount = 0;

    const fn = (one: any, two: any) => {
      callCount++;

      return {
        one,
        two,
      };
    };
    const transformKey = function (args: any[]) {
      return [JSON.stringify(args)];
    };

    const memoized = memoize(fn, { transformKey });

    expect(memoized.options.transformKey).toBe(transformKey);

    const fnArg1 = () => {};
    const fnArg2 = () => {};
    const fnArg3 = () => {};

    expect(memoized({ one: 'one' }, fnArg1)).toEqual({
      one: { one: 'one' },
      two: fnArg1,
    });
    expect(memoized({ one: 'one' }, fnArg2)).toEqual({
      one: { one: 'one' },
      two: fnArg1,
    });
    expect(memoized({ one: 'one' }, fnArg3)).toEqual({
      one: { one: 'one' },
      two: fnArg1,
    });

    expect(callCount).toEqual(1);

    expect(memoized.cache.snapshot()).toEqual({
      entries: [
        {
          key: ['[{"one":"one"},null]'],
          value: { one: { one: 'one' }, two: fnArg1 },
        },
      ],
      size: 1,
    });
  });

  it('will return the memoized function that will use the transformKey method with a custom matchesArg', () => {
    let callCount = 0;

    const fn = (one: any, two: any) => {
      callCount++;

      return {
        one,
        two,
      };
    };
    const matchesArg = function (key1: any, key2: any) {
      return key1.args === key2.args;
    };
    const transformKey = function (args: any[]) {
      return [
        {
          args: JSON.stringify(args),
        },
      ];
    };

    const memoized = memoize(fn, {
      matchesArg,
      transformKey,
    });

    expect(memoized.options.matchesArg).toBe(matchesArg);
    expect(memoized.options.transformKey).toBe(transformKey);

    const fnArg1 = () => {};
    const fnArg2 = () => {};
    const fnArg3 = () => {};

    expect(memoized({ one: 'one' }, fnArg1)).toEqual({
      one: { one: 'one' },
      two: fnArg1,
    });
    expect(memoized({ one: 'one' }, fnArg2)).toEqual({
      one: { one: 'one' },
      two: fnArg1,
    });
    expect(memoized({ one: 'one' }, fnArg3)).toEqual({
      one: { one: 'one' },
      two: fnArg1,
    });

    expect(callCount).toEqual(1);

    expect(memoized.cache.snapshot()).toEqual({
      entries: [
        {
          key: [{ args: '[{"one":"one"},null]' }],
          value: { one: { one: 'one' }, two: fnArg1 },
        },
      ],
      size: 1,
    });
  });

  it('will return a memoized method that will auto-remove the key from cache if async is true and the async is rejected', async () => {
    const timeout = 200;

    const error = new Error('boom');

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const fn = async (_ignored: string) => {
      await new Promise((resolve) => {
        setTimeout(resolve, timeout);
      });

      throw error;
    };
    const async = true;

    const memoized = memoize(fn, { async });

    expect(memoized.options.async).toEqual(async);

    try {
      const pending = memoized('foo');

      const snapshot = memoized.cache.snapshot();

      expect(snapshot.entries.length).toEqual(1);

      await pending.catch();
    } catch (callError) {
      expect(memoized.cache.snapshot()).toEqual({
        entries: [],
        size: 0,
      });

      expect(callError).toBe(error);
    }
  });

  it('will fire the onCache method passed with the cache when it is added to', () => {
    const fn = (one: string, two: string) => ({ one, two });
    const onCache = jest.fn();

    const memoized = memoize(fn, { onCache });

    expect(memoized.options.onCache).toBe(onCache);

    memoized('foo', 'bar');

    expect(onCache).toHaveBeenCalledTimes(1);
    expect(onCache).toHaveBeenCalledWith(
      'add',
      { key: ['foo', 'bar'], value: { one: 'foo', two: 'bar' } },
      memoized.cache,
    );
  });

  it('will fire the onCache method passed with the cache when it is added, hit, and updated', () => {
    const fn = (one: string, two: string) => ({ one, two });
    const onCache = jest.fn();
    const maxSize = 2;

    const memoized = memoize(fn, {
      maxSize,
      onCache,
    });

    expect(memoized.options.onCache).toBe(onCache);

    memoized('foo', 'bar');

    expect(onCache).toHaveBeenCalledTimes(1);
    expect(onCache).toHaveBeenCalledWith(
      'add',
      { key: ['foo', 'bar'], value: { one: 'foo', two: 'bar' } },
      memoized.cache,
    );

    onCache.mockReset();

    memoized('bar', 'foo');

    expect(onCache).toHaveBeenCalledTimes(1);
    expect(onCache).toHaveBeenCalledWith(
      'add',
      { key: ['bar', 'foo'], value: { one: 'bar', two: 'foo' } },
      memoized.cache,
    );

    onCache.mockReset();

    memoized('bar', 'foo');

    expect(onCache).toHaveBeenCalledTimes(1);
    expect(onCache).toHaveBeenCalledWith(
      'hit',
      { key: ['bar', 'foo'], value: { one: 'bar', two: 'foo' } },
      memoized.cache,
    );

    onCache.mockReset();

    memoized('foo', 'bar');

    expect(onCache).toHaveBeenCalledTimes(1);
    expect(onCache).toHaveBeenCalledWith(
      'update',
      { key: ['foo', 'bar'], value: { one: 'foo', two: 'bar' } },
      memoized.cache,
    );

    onCache.mockReset();

    memoized('foo', 'bar');

    expect(onCache).toHaveBeenCalledTimes(1);
    expect(onCache).toHaveBeenCalledWith(
      'hit',
      { key: ['foo', 'bar'], value: { one: 'foo', two: 'bar' } },
      memoized.cache,
    );
  });

  type Dictionary<Type> = {
    [key: string]: Type;
  };

  test('if recursive calls to self will be respected at runtime', () => {
    const calc = memoize(
      (
        object: { [key: string]: any },
        metadata: { c: number },
      ): Dictionary<any> =>
        Object.keys(object).reduce((totals: { [key: string]: number }, key) => {
          if (Array.isArray(object[key])) {
            totals[key] = object[key].map(
              (subObject: { [key: string]: number }) =>
                calc(subObject, metadata),
            );
          } else {
            totals[key] = object[key].a + object[key].b + metadata.c;
          }

          return totals;
        }, {}),
      {
        maxSize: 10,
      },
    );

    const data = {
      fifth: {
        a: 4,
        b: 5,
      },
      first: [
        {
          second: {
            a: 1,
            b: 2,
          },
        },
        {
          third: [
            {
              fourth: {
                a: 2,
                b: 3,
              },
            },
          ],
        },
      ],
    };
    const metadata = {
      c: 6,
    };

    const result1 = calc(data, metadata);
    const result2 = calc(data, metadata);

    expect(result1).toEqual(result2);
  });

  it('will re-memoize the function with merged options if already memoized', () => {
    const fn = () => {};

    const maxSize = 5;
    const matchesArg = () => true;

    const memoized = memoize(fn, { maxSize });
    const reMemoized = memoize(memoized, { matchesArg });

    expect(reMemoized).not.toBe(memoized);
    expect(reMemoized.options.maxSize).toBe(maxSize);
    expect(reMemoized.options.matchesArg).toBe(matchesArg);
  });

  it('will throw an error if not a function', () => {
    const fn = 123;

    expect(() => memoize(fn as any)).toThrow();
  });

  describe('documentation examples', () => {
    it('matches simple usage', () => {
      const assembleToObject = (one: string, two: string) => ({ one, two });

      const memoized = memoize(assembleToObject);

      const result1 = memoized('one', 'two');
      const result2 = memoized('one', 'two');

      expect(result1).toEqual({ one: 'one', two: 'two' });
      expect(result2).toBe(result1);
    });

    it('matches for option `matchesArg`', () => {
      type ContrivedObject = {
        deep: string;
      };

      const deepObject = (object: {
        foo: ContrivedObject;
        bar: ContrivedObject;
        baz?: any;
      }) => ({
        foo: object.foo,
        bar: object.bar,
      });

      const memoizedDeepObject = memoize(deepObject, { matchesArg: deepEqual });

      const result1 = memoizedDeepObject({
        foo: {
          deep: 'foo',
        },
        bar: {
          deep: 'bar',
        },
        baz: {
          deep: 'baz',
        },
      });
      const result2 = memoizedDeepObject({
        foo: {
          deep: 'foo',
        },
        bar: {
          deep: 'bar',
        },
        baz: {
          deep: 'baz',
        },
      });

      expect(result1).toEqual({
        foo: { deep: 'foo' },
        bar: { deep: 'bar' },
      });
      expect(result2).toBe(result1);
    });

    it('matches for option `matchesKey`', () => {
      type ContrivedObject = { foo: string; bar: number; baz: string };

      const deepObject = (object: ContrivedObject) => ({
        foo: object.foo,
        bar: object.bar,
      });

      const memoizedShape = memoize(deepObject, {
        // receives the full key in cache and the full key of the most recent call
        matchesKey(key1, key2) {
          const object1 = key1[0];
          const object2 = key2[0];

          return (
            has(object1, 'foo') &&
            has(object2, 'foo') &&
            object1.bar === object2.bar
          );
        },
      });

      const result1 = memoizedShape({ foo: 'foo', bar: 123, baz: 'baz' });
      const result2 = memoizedShape({ foo: 'foo', bar: 123, baz: 'baz' });

      expect(result1).toEqual({ foo: 'foo', bar: 123 });
      expect(result2).toBe(result1);
    });

    it('matches for option `async`', async () => {
      const fn = async (one: string, two: string) => {
        return new Promise((resolve, reject) => {
          setTimeout(() => {
            reject(new Error(JSON.stringify({ one, two })));
          }, 500);
        });
      };

      const memoized = memoize(fn, { async: true });

      try {
        const pending = memoized('one', 'two');

        const snapshot = memoized.cache.snapshot();

        expect(snapshot.entries).toEqual([
          { key: ['one', 'two'], value: expect.any(Promise) },
        ]);

        await pending.catch();
      } catch (error) {
        expect(memoized.cache.snapshot()).toEqual({
          entries: [],
          size: 0,
        });

        expect(error).toEqual(new Error('{"one":"one","two":"two"}'));
      }
    });

    it('matches for option `maxSize`', () => {
      const manyPossibleArgs = jest.fn((one: string, two: string) => [
        one,
        two,
      ]);

      const memoized = memoize(manyPossibleArgs, { maxSize: 3 });

      memoized('one', 'two');
      memoized('two', 'three');
      memoized('three', 'four');

      expect(manyPossibleArgs).toHaveBeenCalledTimes(3);

      const snapshot = memoized.cache.snapshot();

      expect(snapshot.entries).toEqual([
        { key: ['three', 'four'], value: ['three', 'four'] },
        { key: ['two', 'three'], value: ['two', 'three'] },
        { key: ['one', 'two'], value: ['one', 'two'] },
      ]);

      manyPossibleArgs.mockClear();

      memoized('one', 'two');
      memoized('two', 'three');
      memoized('three', 'four');

      expect(manyPossibleArgs).not.toHaveBeenCalled();

      memoized('four', 'five');

      expect(manyPossibleArgs).toHaveBeenCalled();
    });

    it('matches for option `onCache`', () => {
      const fn = (one: string, two: string) => [one, two];
      const options = {
        maxSize: 2,
        onCache: jest.fn(),
      };

      const memoized = memoize(fn, options);

      memoized('foo', 'bar'); // cache has been added to
      memoized('foo', 'bar');
      memoized('foo', 'bar');

      expect(options.onCache).toHaveBeenCalledTimes(3);
      expect(options.onCache).toHaveBeenNthCalledWith(
        1,
        'add',
        { key: ['foo', 'bar'], value: ['foo', 'bar'] },
        memoized.cache,
      );
      expect(options.onCache).toHaveBeenNthCalledWith(
        2,
        'hit',
        { key: ['foo', 'bar'], value: ['foo', 'bar'] },
        memoized.cache,
      );
      expect(options.onCache).toHaveBeenNthCalledWith(
        3,
        'hit',
        { key: ['foo', 'bar'], value: ['foo', 'bar'] },
        memoized.cache,
      );

      options.onCache.mockClear();

      memoized('bar', 'foo');
      memoized('bar', 'foo');
      memoized('bar', 'foo');

      expect(options.onCache).toHaveBeenCalledTimes(3);
      expect(options.onCache).toHaveBeenNthCalledWith(
        1,
        'add',
        { key: ['bar', 'foo'], value: ['bar', 'foo'] },
        memoized.cache,
      );
      expect(options.onCache).toHaveBeenNthCalledWith(
        2,
        'hit',
        { key: ['bar', 'foo'], value: ['bar', 'foo'] },
        memoized.cache,
      );
      expect(options.onCache).toHaveBeenNthCalledWith(
        3,
        'hit',
        { key: ['bar', 'foo'], value: ['bar', 'foo'] },
        memoized.cache,
      );

      options.onCache.mockClear();

      memoized('foo', 'bar');
      memoized('foo', 'bar');
      memoized('foo', 'bar');

      expect(options.onCache).toHaveBeenCalledTimes(3);
      expect(options.onCache).toHaveBeenNthCalledWith(
        1,
        'update',
        { key: ['foo', 'bar'], value: ['foo', 'bar'] },
        memoized.cache,
      );
      expect(options.onCache).toHaveBeenNthCalledWith(
        2,
        'hit',
        { key: ['foo', 'bar'], value: ['foo', 'bar'] },
        memoized.cache,
      );
      expect(options.onCache).toHaveBeenNthCalledWith(
        3,
        'hit',
        { key: ['foo', 'bar'], value: ['foo', 'bar'] },
        memoized.cache,
      );
    });

    it('matches for option `transformKey`', () => {
      const ignoreFunctionArg = jest.fn((one: string, two: () => void) => [
        one,
        two,
      ]);

      const memoized = memoize(ignoreFunctionArg, {
        matchesKey: (key1, key2) => key1[0] === key2[0],
        // Cache based on the serialized first parameter
        transformKey: (args) => [JSON.stringify(args[0])],
      });

      memoized('one', () => {});
      memoized('one', () => {});

      expect(ignoreFunctionArg).toHaveBeenCalledTimes(1);
    });
  });
});

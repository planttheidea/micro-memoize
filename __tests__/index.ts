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

  it('will return the memoized function that handles variable keys', () => {
    let callCount = 0;

    const fn = (one: any, two?: any) => {
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

    expect(memoized('one', 'two')).toEqual({
      one: 'one',
      two: 'two',
    });
    expect(memoized('one', 'two')).toEqual({
      one: 'one',
      two: 'two',
    });
    expect(memoized('one')).toEqual({
      one: 'one',
      two: undefined,
    });
    expect(memoized('one', 'two')).toEqual({
      one: 'one',
      two: 'two',
    });
    expect(memoized('one', 'two')).toEqual({
      one: 'one',
      two: 'two',
    });

    expect(callCount).toEqual(3);

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
    const maxSize = 10;

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
        { key: ['one', 'two'], value: { one: 'one', two: 'two' } },
      ],
      size: 4,
    });
  });

  it('will return the memoized function that can have multiple cached key => value pairs with cache eviction', () => {
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

  it('will notify of resolved when async is true and resolves', async () => {
    const timeout = 200;

    const fn = (value: string) =>
      new Promise((resolve) => {
        setTimeout(() => {
          resolve(value);
        }, timeout);
      });

    const memoized = memoize(fn, { async: true });

    expect(memoized.options.async).toBe(true);

    const onUpdate = jest.fn();

    memoized.cache.on('update', onUpdate);

    const result = await memoized('foo');

    expect(result).toBe('foo');

    expect(onUpdate).toHaveBeenCalledTimes(1);
    expect(onUpdate).toHaveBeenCalledWith({
      cache: memoized.cache,
      entry: { key: ['foo'], value: expect.any(Promise) },
      reason: 'resolved',
      type: 'update',
    });
  });

  it('will notify of rejected when async is true and rejects', async () => {
    const timeout = 200;

    const error = new Error('boom');

    const fn = async (value: string) => {
      await new Promise((resolve) => {
        setTimeout(() => {
          resolve(value);
        }, timeout);
      });

      throw error;
    };

    const memoized = memoize(fn, { async: true });

    expect(memoized.options.async).toBe(true);

    const onDelete = jest.fn();

    memoized.cache.on('delete', onDelete);

    const pending = memoized('foo');

    const snapshot = memoized.cache.snapshot();

    expect(snapshot.entries.length).toEqual(1);

    const catchSpy = jest.fn();

    await pending.catch(catchSpy);

    expect(onDelete).toHaveBeenCalledTimes(1);
    expect(onDelete).toHaveBeenCalledWith({
      cache: memoized.cache,
      entry: { key: ['foo'], value: expect.any(Promise) },
      reason: 'rejected',
      type: 'delete',
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

    const memoized = memoize(fn, { async: true });

    expect(memoized.options.async).toBe(true);

    const pending = memoized('foo');

    const snapshot = memoized.cache.snapshot();

    expect(snapshot.entries.length).toEqual(1);

    const catchSpy = jest.fn();

    await pending.catch(catchSpy);

    expect(memoized.cache.snapshot()).toEqual({
      entries: [],
      size: 0,
    });

    expect(catchSpy).toHaveBeenCalledWith(error);
  });

  it('will fire the cache event method passed with the cache when it is added, hit, and updated', () => {
    const fn = (one: string, two: string) => ({ one, two });

    const onAdd = jest.fn();
    const onDelete = jest.fn();
    const onHit = jest.fn();
    const onUpdate = jest.fn();
    const maxSize = 2;

    const memoized = memoize(fn, { maxSize });

    memoized.cache.on('add', onAdd);
    memoized.cache.on('delete', onDelete);
    memoized.cache.on('hit', onHit);
    memoized.cache.on('update', onUpdate);

    memoized('foo', 'bar');

    expect(onAdd).toHaveBeenCalledTimes(1);
    expect(onDelete).not.toHaveBeenCalled();
    expect(onHit).not.toHaveBeenCalled();
    expect(onUpdate).not.toHaveBeenCalled();

    expect(onAdd).toHaveBeenCalledWith({
      cache: memoized.cache,
      entry: { key: ['foo', 'bar'], value: { one: 'foo', two: 'bar' } },
      type: 'add',
    });

    onAdd.mockReset();

    memoized('bar', 'foo');

    expect(onAdd).toHaveBeenCalledTimes(1);
    expect(onDelete).not.toHaveBeenCalled();
    expect(onHit).not.toHaveBeenCalled();
    expect(onUpdate).not.toHaveBeenCalled();

    expect(onAdd).toHaveBeenCalledWith({
      cache: memoized.cache,
      entry: { key: ['bar', 'foo'], value: { one: 'bar', two: 'foo' } },
      type: 'add',
    });

    onAdd.mockReset();

    memoized('bar', 'foo');

    expect(onAdd).not.toHaveBeenCalled();
    expect(onDelete).not.toHaveBeenCalled();
    expect(onHit).toHaveBeenCalledTimes(1);
    expect(onUpdate).not.toHaveBeenCalled();

    expect(onHit).toHaveBeenCalledWith({
      cache: memoized.cache,
      entry: { key: ['bar', 'foo'], value: { one: 'bar', two: 'foo' } },
      type: 'hit',
    });

    onHit.mockReset();

    memoized('foo', 'bar');

    expect(onAdd).not.toHaveBeenCalled();
    expect(onDelete).not.toHaveBeenCalled();
    expect(onHit).not.toHaveBeenCalled();
    expect(onUpdate).toHaveBeenCalledTimes(1);

    expect(onUpdate).toHaveBeenCalledWith({
      cache: memoized.cache,
      entry: { key: ['foo', 'bar'], value: { one: 'foo', two: 'bar' } },
      type: 'update',
    });

    onUpdate.mockReset();

    memoized('foo', 'bar');

    expect(onAdd).not.toHaveBeenCalled();
    expect(onDelete).not.toHaveBeenCalled();
    expect(onHit).toHaveBeenCalledTimes(1);
    expect(onUpdate).not.toHaveBeenCalled();

    expect(onHit).toHaveBeenCalledWith({
      cache: memoized.cache,
      entry: { key: ['foo', 'bar'], value: { one: 'foo', two: 'bar' } },
      type: 'hit',
    });

    onHit.mockReset();

    memoized('bar', 'baz');

    expect(onAdd).toHaveBeenCalledTimes(1);
    expect(onDelete).toHaveBeenCalledTimes(1);
    expect(onHit).not.toHaveBeenCalled();
    expect(onUpdate).not.toHaveBeenCalled();

    expect(onAdd).toHaveBeenCalledWith({
      cache: memoized.cache,
      entry: { key: ['bar', 'baz'], value: { one: 'bar', two: 'baz' } },
      type: 'add',
    });
    expect(onDelete).toHaveBeenCalledWith({
      cache: memoized.cache,
      entry: { key: ['bar', 'foo'], value: { one: 'bar', two: 'foo' } },
      reason: 'evicted',
      type: 'delete',
    });
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
        return new Promise((_resolve, reject) => {
          setTimeout(() => {
            reject(new Error(JSON.stringify({ one, two })));
          }, 500);
        });
      };

      const memoized = memoize(fn, { async: true });

      const pending = memoized('one', 'two');

      const snapshot = memoized.cache.snapshot();

      expect(snapshot.entries).toEqual([
        { key: ['one', 'two'], value: expect.any(Promise) },
      ]);

      const catchSpy = jest.fn();

      await pending.catch(catchSpy);

      expect(memoized.cache.snapshot()).toEqual({
        entries: [],
        size: 0,
      });

      expect(catchSpy).toHaveBeenCalledWith(
        new Error('{"one":"one","two":"two"}'),
      );
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

    it('matches for event listeners', () => {
      const fn = (one: string, two: string) => [one, two];
      const options = { maxSize: 2 };

      const onAdd = jest.fn();
      const onHit = jest.fn();
      const onUpdate = jest.fn();

      const memoized = memoize(fn, options);

      memoized.cache.on('add', onAdd);
      memoized.cache.on('hit', onHit);
      memoized.cache.on('update', onUpdate);

      memoized('foo', 'bar'); // cache has been added to
      memoized('foo', 'bar');
      memoized('foo', 'bar');

      expect(onAdd).toHaveBeenCalledTimes(1);
      expect(onAdd).toHaveBeenCalledWith({
        cache: memoized.cache,
        entry: { key: ['foo', 'bar'], value: ['foo', 'bar'] },
        type: 'add',
      });

      expect(onHit).toHaveBeenCalledTimes(2);
      expect(onHit).toHaveBeenNthCalledWith(1, {
        cache: memoized.cache,
        entry: { key: ['foo', 'bar'], value: ['foo', 'bar'] },
        type: 'hit',
      });
      expect(onHit).toHaveBeenNthCalledWith(2, {
        cache: memoized.cache,
        entry: { key: ['foo', 'bar'], value: ['foo', 'bar'] },
        type: 'hit',
      });

      expect(onUpdate).not.toHaveBeenCalled();

      onAdd.mockClear();
      onHit.mockClear();

      memoized('bar', 'foo');
      memoized('bar', 'foo');
      memoized('bar', 'foo');

      expect(onAdd).toHaveBeenCalledTimes(1);
      expect(onAdd).toHaveBeenCalledWith({
        cache: memoized.cache,
        entry: { key: ['bar', 'foo'], value: ['bar', 'foo'] },
        type: 'add',
      });

      expect(onHit).toHaveBeenCalledTimes(2);
      expect(onHit).toHaveBeenNthCalledWith(1, {
        cache: memoized.cache,
        entry: { key: ['bar', 'foo'], value: ['bar', 'foo'] },
        type: 'hit',
      });
      expect(onHit).toHaveBeenNthCalledWith(2, {
        cache: memoized.cache,
        entry: { key: ['bar', 'foo'], value: ['bar', 'foo'] },
        type: 'hit',
      });

      expect(onUpdate).not.toHaveBeenCalled();

      onAdd.mockClear();
      onHit.mockClear();

      memoized('foo', 'bar');
      memoized('foo', 'bar');
      memoized('foo', 'bar');

      expect(onAdd).not.toHaveBeenCalled();

      expect(onHit).toHaveBeenCalledTimes(2);
      expect(onHit).toHaveBeenNthCalledWith(1, {
        cache: memoized.cache,
        entry: { key: ['foo', 'bar'], value: ['foo', 'bar'] },
        type: 'hit',
      });
      expect(onHit).toHaveBeenNthCalledWith(2, {
        cache: memoized.cache,
        entry: { key: ['foo', 'bar'], value: ['foo', 'bar'] },
        type: 'hit',
      });

      expect(onUpdate).toHaveBeenCalledTimes(1);
      expect(onUpdate).toHaveBeenCalledWith({
        cache: memoized.cache,
        entry: { key: ['foo', 'bar'], value: ['foo', 'bar'] },
        type: 'update',
      });

      memoized.cache.off('add', onAdd);
      memoized.cache.off('hit', onHit);
      memoized.cache.off('update', onUpdate);

      memoized('bar', 'foo');

      onAdd.mockClear();
      onHit.mockClear();
      onUpdate.mockClear();

      memoized('foo', 'bar');
      memoized('baz', 'quz');
      memoized('foo', 'bar');

      expect(onAdd).not.toHaveBeenCalled();
      expect(onHit).not.toHaveBeenCalled();
      expect(onUpdate).not.toHaveBeenCalled();
    });

    it('matches for option `transformKey`', () => {
      const ignoreFunctionArg = jest.fn((one: string, two: () => void) => ({
        one,
        two,
      }));

      const memoized = memoize(ignoreFunctionArg, {
        matchesKey: (key1, key2) => key1[0] === key2[0],
        // Cache based on the serialized first parameter
        transformKey: (args) => [
          JSON.stringify(args, (_key: string, value: any) =>
            typeof value === 'function' ? value.toString() : value,
          ),
        ],
      });

      memoized('one', () => {});
      memoized('one', () => {});

      expect(ignoreFunctionArg).toHaveBeenCalledTimes(1);
      expect(memoized.cache.snapshot()).toEqual({
        entries: [
          {
            key: ['["one","function () { }"]'],
            value: { one: 'one', two: expect.any(Function) },
          },
        ],
        size: 1,
      });
      expect(memoized.cache.get(['one', () => {}])).toEqual({
        one: 'one',
        two: expect.any(Function),
      });
    });
  });

  describe('cache mutation methods', () => {
    it('should allow getting values in cache', () => {
      const fn = jest.fn((one: string, two: string) => one + two);
      const memoized = memoize(fn);

      memoized('foo', 'bar');

      expect(memoized.cache.get(['foo', 'bar'])).toBe('foobar');
      expect(memoized.cache.get(['bar', 'baz'])).toBe(undefined);
    });

    it('should correctly identify entries in cache', () => {
      const fn = jest.fn((one: string, two: string) => one + two);
      const memoized = memoize(fn);

      memoized('foo', 'bar');

      expect(memoized.cache.has(['foo', 'bar'])).toBe(true);
      expect(memoized.cache.has(['bar', 'baz'])).toBe(false);
    });

    it('should allow adding values to cache', () => {
      const fn = jest.fn((one: string, two: string) => one + two);
      const memoized = memoize(fn);

      expect(memoized.cache.snapshot()).toEqual({ entries: [], size: 0 });

      memoized.cache.set(['foo', 'bar'], 'foobar');

      expect(memoized.cache.snapshot()).toEqual({
        entries: [{ key: ['foo', 'bar'], value: 'foobar' }],
        size: 1,
      });

      expect(memoized.cache.get(['foo', 'bar'])).toBe('foobar');

      memoized('foo', 'bar');

      expect(fn).not.toHaveBeenCalled();
    });

    it('should allow updating values in cache', () => {
      const fn = jest.fn((one: string, two: string) => one + two);
      const memoized = memoize(fn);

      memoized('foo', 'bar');

      fn.mockClear();

      expect(memoized.cache.snapshot()).toEqual({
        entries: [{ key: ['foo', 'bar'], value: 'foobar' }],
        size: 1,
      });

      memoized.cache.set(['foo', 'bar'], 'OVERRIDE');

      expect(memoized.cache.snapshot()).toEqual({
        entries: [{ key: ['foo', 'bar'], value: 'OVERRIDE' }],
        size: 1,
      });

      expect(memoized.cache.get(['foo', 'bar'])).toBe('OVERRIDE');

      memoized('foo', 'bar');

      expect(fn).not.toHaveBeenCalled();
    });

    it('should allow updating older values in cache', () => {
      const fn = jest.fn((one: string, two: string) => one + two);
      const memoized = memoize(fn, { maxSize: 2 });

      memoized('foo', 'bar');
      memoized('bar', 'baz');

      fn.mockClear();

      expect(memoized.cache.snapshot()).toEqual({
        entries: [
          { key: ['bar', 'baz'], value: 'barbaz' },
          { key: ['foo', 'bar'], value: 'foobar' },
        ],
        size: 2,
      });

      memoized.cache.set(['foo', 'bar'], 'OVERRIDE');

      expect(memoized.cache.snapshot()).toEqual({
        entries: [
          { key: ['foo', 'bar'], value: 'OVERRIDE' },
          { key: ['bar', 'baz'], value: 'barbaz' },
        ],
        size: 2,
      });

      expect(memoized.cache.get(['foo', 'bar'])).toBe('OVERRIDE');

      memoized('foo', 'bar');

      expect(fn).not.toHaveBeenCalled();
    });

    it('allows deleting values in cache', () => {
      const fn = jest.fn((one: string, two: string) => one + two);
      const memoized = memoize(fn);

      memoized.cache.set(['foo', 'bar'], 'foobar');

      expect(memoized.cache.snapshot()).toEqual({
        entries: [{ key: ['foo', 'bar'], value: 'foobar' }],
        size: 1,
      });

      const result = memoized.cache.delete(['foo', 'bar']);

      expect(result).toBe(true);

      expect(memoized.cache.snapshot()).toEqual({ entries: [], size: 0 });
    });

    it('returns false when deleting an item that does not exist', () => {
      const fn = jest.fn((one: string, two: string) => one + two);
      const memoized = memoize(fn);

      memoized.cache.set(['foo', 'bar'], 'foobar');

      expect(memoized.cache.delete(['bar', 'baz'])).toBe(false);

      const result = memoized.cache.delete(['foo', 'bar']);

      expect(result).toBe(true);

      expect(memoized.cache.delete(['foo', 'bar'])).toBe(false);
    });

    it('allows clearing cache', () => {
      const fn = jest.fn((one: string, two: string) => one + two);
      const memoized = memoize(fn, { maxSize: 3 });

      memoized('foo', 'bar');
      memoized('bar', 'baz');
      memoized('baz', 'quz');

      expect(memoized.cache.snapshot()).toEqual({
        entries: [
          { key: ['baz', 'quz'], value: 'bazquz' },
          { key: ['bar', 'baz'], value: 'barbaz' },
          { key: ['foo', 'bar'], value: 'foobar' },
        ],
        size: 3,
      });

      memoized.cache.clear();

      expect(memoized.cache.snapshot()).toEqual({ entries: [], size: 0 });
    });
  });
});

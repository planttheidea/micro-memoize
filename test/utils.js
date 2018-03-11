// test
import test from 'ava';
import sinon from 'sinon';

// src
import * as utils from 'src/utils';

test('if areKeysEqual will return false when the length of the keys are different', (t) => {
  const isEqual = (o1, o2) => {
    return o1 === o2;
  };

  const areKeysEqual = utils.createAreKeysEqual(isEqual);

  const keys1 = [];
  const keys2 = ['key'];

  t.false(areKeysEqual(keys1, keys2));
});

test('if areKeysEqual will return false when the keys have different values', (t) => {
  const isEqual = (o1, o2) => {
    return o1 === o2;
  };

  const areKeysEqual = utils.createAreKeysEqual(isEqual);

  const keys1 = ['key'];
  const keys2 = ['other key'];

  t.false(areKeysEqual(keys1, keys2));
});

test('if areKeysEqual will return true when the keys have equal values', (t) => {
  const isEqual = (o1, o2) => {
    return o1 === o2;
  };

  const areKeysEqual = utils.createAreKeysEqual(isEqual);

  const keys1 = ['key'];
  const keys2 = ['key'];

  t.true(areKeysEqual(keys1, keys2));
});

test('if getKeyIndex will return the index of the match found', (t) => {
  const isEqual = (o1, o2) => {
    return o1 === o2;
  };

  const getKeyIndex = utils.createGetKeyIndex(isEqual);

  const allKeys = [['key'], ['other key']];
  const keysToMatch = ['other key'];

  const result = getKeyIndex(allKeys, keysToMatch);

  t.is(result, 1);
});

test('if getKeyIndex will return -1 if no match is found', (t) => {
  const isEqual = (o1, o2) => {
    return o1 === o2;
  };

  const getKeyIndex = utils.createGetKeyIndex(isEqual);

  const allKeys = [['key'], ['other key']];
  const keysToMatch = ['not present key'];

  const result = getKeyIndex(allKeys, keysToMatch);

  t.is(result, -1);
});

test('if getTransformedKey will return the transformed key itself when it is an array', (t) => {
  const transformKey = (args) => {
    const [one, two] = args;

    return [two, one];
  };

  const getTransformedKey = utils.createGetTransformedKey(transformKey);

  const args = ['one', 'two'];

  const result = getTransformedKey(args);

  t.deepEqual(result, [...args].reverse());
});

test('if getTransformedKey will return the transformed key in an array when it is not an array', (t) => {
  const transformKey = (args) => {
    const [one, two] = args;

    return JSON.stringify([two, one]);
  };

  const getTransformedKey = utils.createGetTransformedKey(transformKey);

  const args = ['one', 'two'];

  const result = getTransformedKey(
    (function() {
      return arguments;
    })(...args)
  );

  t.deepEqual(result, [JSON.stringify([...args].reverse())]);
});

test('if isSameValueZero will return true when the objects are equal', (t) => {
  const object1 = {};
  const object2 = object1;

  t.true(utils.isSameValueZero(object1, object2));
});

test('if isSameValueZero will return true when the objects are both NaN', (t) => {
  const object1 = NaN;
  const object2 = NaN;

  t.true(utils.isSameValueZero(object1, object2));
});

test('if isSameValueZero will return false when the objects are different', (t) => {
  const object1 = {};
  const object2 = {};

  t.false(utils.isSameValueZero(object1, object2));
});

test('if orderByLru will do nothing if the itemIndex is 0', (t) => {
  const array = ['first', 'second', 'third'];
  const itemIndex = 0;
  const value = array[itemIndex];

  utils.orderByLru(array, value, itemIndex);

  t.deepEqual(array, ['first', 'second', 'third']);
});

test('if orderByLru will place the itemIndex first in order when non-zero', (t) => {
  const array = ['first', 'second', 'third'];
  const itemIndex = 1;
  const value = array[itemIndex];

  utils.orderByLru(array, value, itemIndex);

  t.deepEqual(array, ['second', 'first', 'third']);
});

test('if orderByLru will add the new item to the array when the itemIndex is the array length', (t) => {
  const array = ['first', 'second', 'third'];
  const itemIndex = array.length;
  const value = 'new';

  utils.orderByLru(array, value, itemIndex);

  t.deepEqual(array, ['new', 'first', 'second', 'third']);
});

test('if setPromiseHandler will fire cache callbacks if resolved', async (t) => {
  const timeout = 200;

  const fn = async () => {
    await new Promise((resolve) => {
      setTimeout(resolve, timeout);
    });

    return 'resolved';
  };
  const key = ['foo'];
  const memoized = () => {};

  const value = fn();

  const cache = {
    keys: [key],
    values: [value]
  };
  const options = {
    isEqual: utils.isSameValueZero,
    onCacheChange: sinon.spy(),
    onCacheHit: sinon.spy()
  };

  utils.setPromiseHandler(cache, options, memoized);

  // this is just to prevent the unhandled rejection noise
  cache.values[0].catch(() => {});

  t.is(cache.keys.length, 1);
  t.is(cache.values.length, 1);
  t.not(cache.values[0], value);

  await new Promise((resolve) => {
    setTimeout(resolve, timeout + 50);
  });

  t.is(cache.keys.length, 1);
  t.is(cache.values.length, 1);
  t.not(cache.values[0], value);

  t.true(options.onCacheHit.calledOnce);
  t.true(options.onCacheHit.calledWith(cache, options, memoized));

  t.true(options.onCacheChange.calledOnce);
  t.true(options.onCacheChange.calledWith(cache, options, memoized));
});

test('if setPromiseHandler will remove the key from cache when the promise is rejected', async (t) => {
  const timeout = 200;

  const fn = async () => {
    await new Promise((resolve) => {
      setTimeout(resolve, timeout);
    });

    throw new Error('boom');
  };
  const key = ['foo'];
  const value = fn();

  const cache = {
    keys: [key],
    values: [value]
  };
  const options = {
    isEqual: utils.isSameValueZero,
    onCacheChange: sinon.spy(),
    onCacheHit: sinon.spy()
  };
  const memoized = () => {};

  utils.setPromiseHandler(cache, options, memoized);

  // this is just to prevent the unhandled rejection noise
  cache.values[0].catch(() => {});

  t.is(cache.keys.length, 1);
  t.is(cache.values.length, 1);
  t.not(cache.values[0], value);

  await new Promise((resolve) => {
    setTimeout(resolve, timeout + 50);
  });

  t.deepEqual(cache, {
    keys: [],
    values: []
  });

  t.true(options.onCacheHit.notCalled);

  t.true(options.onCacheChange.notCalled);
});

test('if setPromiseHandler will not remove the key from cache when the promise is rejected but the key no longer exists', async (t) => {
  const timeout = 200;

  const fn = async () => {
    await new Promise((resolve) => {
      setTimeout(resolve, timeout);
    });

    throw new Error('boom');
  };
  const key = ['foo'];
  const value = fn();

  const cache = {
    keys: [key],
    values: [value]
  };
  const options = {
    isEqual: utils.isSameValueZero,
    onCacheChange: sinon.spy(),
    onCacheHit: sinon.spy()
  };
  const memoized = () => {};

  utils.setPromiseHandler(cache, options, memoized);

  const newValue = cache.values[0];

  // this is just to prevent the unhandled rejection noise
  newValue.catch(() => {});

  t.is(cache.keys.length, 1);
  t.is(cache.values.length, 1);
  t.not(cache.values[0], value);

  cache.keys = [];
  cache.values = [];

  await new Promise((resolve) => {
    setTimeout(resolve, timeout + 50);
  });

  t.deepEqual(cache, {
    keys: [],
    values: []
  });

  t.true(options.onCacheHit.notCalled);

  t.true(options.onCacheChange.notCalled);
});

test('if cloneArray will clone the array shallowly', (t) => {
  const original = ['foo', {bar: 'baz'}];

  const result = utils.cloneArray(original);

  t.not(result, original);
  t.deepEqual(result, original);
});

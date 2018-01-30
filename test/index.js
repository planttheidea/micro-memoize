// test
import test from 'ava';
import {deepEqual} from 'fast-equals';

// src
import memoize from 'src/index';

test('if memoize will return the function if already memoized', (t) => {
  const fn = () => {};

  fn.isMemoized = true;

  const memoized = memoize(fn);

  t.is(memoized, fn);
});

test('if memoize will return the memoized function', (t) => {
  let callCount = 0;

  const fn = (one, two) => {
    callCount++;

    return {one, two};
  };

  const memoized = memoize(fn);

  t.deepEqual(memoized.cache, {
    keys: [],
    values: []
  });

  t.deepEqual(memoized.cacheSnapshot, {
    keys: [],
    values: []
  });

  t.true(memoized.isMemoized);

  t.deepEqual(memoized.options, {});

  new Array(1000).fill('').forEach(() => {
    t.deepEqual(memoized('one', 'two'), {one: 'one', two: 'two'});
  });

  t.is(callCount, 1);

  t.deepEqual(memoized.cache, {
    keys: [['one', 'two']],
    values: [{one: 'one', two: 'two'}]
  });
});

test('if memoize will return the memoized function that can have multiple cached key => value pairs', (t) => {
  let callCount = 0;

  const fn = (one, two) => {
    callCount++;

    return {one, two};
  };

  const memoized = memoize(fn, {maxSize: 3});

  t.deepEqual(memoized.cache, {
    keys: [],
    values: []
  });

  t.deepEqual(memoized.cacheSnapshot, {
    keys: [],
    values: []
  });

  t.true(memoized.isMemoized);

  t.deepEqual(memoized.options, {maxSize: 3});

  t.deepEqual(memoized('one', 'two'), {one: 'one', two: 'two'});
  t.deepEqual(memoized('two', 'three'), {one: 'two', two: 'three'});
  t.deepEqual(memoized('three', 'four'), {one: 'three', two: 'four'});
  t.deepEqual(memoized('four', 'five'), {one: 'four', two: 'five'});
  t.deepEqual(memoized('two', 'three'), {one: 'two', two: 'three'});
  t.deepEqual(memoized('three', 'four'), {one: 'three', two: 'four'});

  t.is(callCount, 4);

  t.deepEqual(memoized.cache, {
    keys: [['three', 'four'], ['two', 'three'], ['four', 'five']],
    values: [{one: 'three', two: 'four'}, {one: 'two', two: 'three'}, {one: 'four', two: 'five'}]
  });
});

test('if memoize will return the memoized function that will use the custom isEqual method', (t) => {
  let callCount = 0;

  const fn = (one, two) => {
    callCount++;

    return {one, two};
  };

  const memoized = memoize(fn, {isEqual: deepEqual});

  t.deepEqual(memoized({deep: {value: 'value'}}, {other: {deep: {value: 'value'}}}), {
    one: {deep: {value: 'value'}},
    two: {other: {deep: {value: 'value'}}}
  });

  t.deepEqual(memoized({deep: {value: 'value'}}, {other: {deep: {value: 'value'}}}), {
    one: {deep: {value: 'value'}},
    two: {other: {deep: {value: 'value'}}}
  });

  t.is(callCount, 1);

  t.deepEqual(memoized.cache, {
    keys: [[{deep: {value: 'value'}}, {other: {deep: {value: 'value'}}}]],
    values: [
      {
        one: {deep: {value: 'value'}},
        two: {other: {deep: {value: 'value'}}}
      }
    ]
  });
});

test('if memoize will return the memoized function that will use the transformKey method', (t) => {
  let callCount = 0;

  const fn = (one, two) => {
    callCount++;

    return {one, two};
  };

  const memoized = memoize(fn, {
    transformKey(args) {
      return JSON.stringify(args);
    }
  });

  const fnArg1 = () => {};
  const fnArg2 = () => {};
  const fnArg3 = () => {};

  t.deepEqual(memoized({one: 'one'}, fnArg1), {one: {one: 'one'}, two: fnArg1});
  t.deepEqual(memoized({one: 'one'}, fnArg2), {one: {one: 'one'}, two: fnArg1});
  t.deepEqual(memoized({one: 'one'}, fnArg3), {one: {one: 'one'}, two: fnArg1});

  t.is(callCount, 1);

  t.deepEqual(memoized.cache, {
    keys: [['[{"one":"one"},null]']],
    values: [
      {
        one: {one: 'one'},
        two: fnArg1
      }
    ]
  });
});

test('if memoize will return the memoized function that will use the transformKey method with a custom isEqual', (t) => {
  let callCount = 0;

  const fn = (one, two) => {
    callCount++;

    return {one, two};
  };

  const memoized = memoize(fn, {
    isEqual(key1, key2) {
      return key1.args === key2.args;
    },
    transformKey(args) {
      return {
        args: JSON.stringify(args)
      };
    }
  });

  const fnArg1 = () => {};
  const fnArg2 = () => {};
  const fnArg3 = () => {};

  t.deepEqual(memoized({one: 'one'}, fnArg1), {one: {one: 'one'}, two: fnArg1});
  t.deepEqual(memoized({one: 'one'}, fnArg2), {one: {one: 'one'}, two: fnArg1});
  t.deepEqual(memoized({one: 'one'}, fnArg3), {one: {one: 'one'}, two: fnArg1});

  t.is(callCount, 1);

  t.deepEqual(memoized.cache, {
    keys: [
      [
        {
          args: '[{"one":"one"},null]'
        }
      ]
    ],
    values: [
      {
        one: {one: 'one'},
        two: fnArg1
      }
    ]
  });
});

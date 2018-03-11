// test
import test from 'ava';
import sinon from 'sinon';
import {deepEqual} from 'fast-equals';

// src
import memoize from 'src/index';
import * as utils from 'src/utils';

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

  t.deepEqual(memoized.options, {
    isEqual: utils.isSameValueZero,
    isPromise: false,
    maxSize: 1,
    onCacheAdd: utils.onCacheOperation,
    onCacheHit: utils.onCacheOperation,
    onCacheChange: utils.onCacheOperation,
    transformKey: undefined
  });

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
  const maxSize = 3;

  const memoized = memoize(fn, {maxSize});

  t.deepEqual(memoized.cache, {
    keys: [],
    values: []
  });

  t.deepEqual(memoized.cacheSnapshot, {
    keys: [],
    values: []
  });

  t.true(memoized.isMemoized);

  t.is(memoized.options.maxSize, maxSize);

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

  t.is(memoized.options.isEqual, deepEqual);

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
  const transformKey = function(args) {
    return JSON.stringify(args);
  };

  const memoized = memoize(fn, {
    transformKey
  });

  t.is(memoized.options.transformKey, transformKey);

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
  const isEqual = function(key1, key2) {
    return key1.args === key2.args;
  };
  const transformKey = function(args) {
    return {
      args: JSON.stringify(args)
    };
  };

  const memoized = memoize(fn, {
    isEqual,
    transformKey
  });

  t.is(memoized.options.isEqual, isEqual);
  t.is(memoized.options.transformKey, transformKey);

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

test('if memoize will return a memoized method that will auto-remove the key from cache if isPromise is true and the promise is rejected', async (t) => {
  const timeout = 200;

  const error = new Error('boom');

  const fn = async () => {
    await new Promise((resolve) => {
      setTimeout(resolve, timeout);
    });

    throw error;
  };
  const isPromise = true;

  const memoized = memoize(fn, {isPromise});

  t.is(memoized.options.isPromise, isPromise);

  const spy = sinon.spy();

  memoized('foo').catch(spy);

  t.is(memoized.cacheSnapshot.keys.length, 1);
  t.is(memoized.cacheSnapshot.values.length, 1);

  await new Promise((resolve) => {
    setTimeout(resolve, timeout + 50);
  });

  t.deepEqual(memoized.cacheSnapshot, {
    keys: [],
    values: []
  });

  t.true(spy.calledOnce);
  t.true(spy.calledWith(error));
});

test('if memoize will fire the onCacheChange method passed with the cache when it is added to', (t) => {
  const fn = (one, two) => {
    return {one, two};
  };
  const onCacheChange = sinon.spy();

  const memoized = memoize(fn, {onCacheChange});

  t.is(memoized.options.onCacheChange, onCacheChange);

  memoized('foo');

  t.true(onCacheChange.calledOnce);
  t.deepEqual(onCacheChange.args[0], [
    memoized.cache,
    {
      isEqual: utils.isSameValueZero,
      isPromise: false,
      maxSize: 1,
      onCacheAdd: utils.onCacheOperation,
      onCacheChange,
      onCacheHit: utils.onCacheOperation,
      transformKey: undefined
    },
    memoized
  ]);
});

test('if memoize will fire the onCacheChange method passed with the cache when it is updated', (t) => {
  const fn = (one, two) => {
    return {one, two};
  };
  const onCacheChange = sinon.spy();
  const maxSize = 2;

  const memoized = memoize(fn, {maxSize, onCacheChange});

  t.is(memoized.options.onCacheChange, onCacheChange);

  memoized('foo', 'bar');

  t.true(onCacheChange.calledOnce);
  t.deepEqual(onCacheChange.args[0], [
    {keys: [['foo', 'bar']], values: [{one: 'foo', two: 'bar'}]},
    {
      isEqual: utils.isSameValueZero,
      isPromise: false,
      maxSize,
      onCacheAdd: utils.onCacheOperation,
      onCacheChange,
      onCacheHit: utils.onCacheOperation,
      transformKey: undefined
    },
    memoized
  ]);

  memoized('bar', 'foo');

  t.true(onCacheChange.calledTwice);
  t.deepEqual(onCacheChange.args[1], [
    {keys: [['bar', 'foo'], ['foo', 'bar']], values: [{one: 'bar', two: 'foo'}, {one: 'foo', two: 'bar'}]},
    {
      isEqual: utils.isSameValueZero,
      isPromise: false,
      maxSize,
      onCacheAdd: utils.onCacheOperation,
      onCacheChange,
      onCacheHit: utils.onCacheOperation,
      transformKey: undefined
    },
    memoized
  ]);

  memoized('bar', 'foo');

  t.true(onCacheChange.calledTwice);
  t.deepEqual(onCacheChange.args[1], [
    {keys: [['bar', 'foo'], ['foo', 'bar']], values: [{one: 'bar', two: 'foo'}, {one: 'foo', two: 'bar'}]},
    {
      isEqual: utils.isSameValueZero,
      isPromise: false,
      maxSize,
      onCacheAdd: utils.onCacheOperation,
      onCacheChange,
      onCacheHit: utils.onCacheOperation,
      transformKey: undefined
    },
    memoized
  ]);

  memoized('foo', 'bar');

  t.true(onCacheChange.calledThrice);
  t.deepEqual(onCacheChange.args[2], [
    {keys: [['foo', 'bar'], ['bar', 'foo']], values: [{one: 'foo', two: 'bar'}, {one: 'bar', two: 'foo'}]},
    {
      isEqual: utils.isSameValueZero,
      isPromise: false,
      maxSize,
      onCacheAdd: utils.onCacheOperation,
      onCacheChange,
      onCacheHit: utils.onCacheOperation,
      transformKey: undefined
    },
    memoized
  ]);

  memoized('foo', 'bar');

  t.true(onCacheChange.calledThrice);
  t.deepEqual(onCacheChange.args[2], [
    {keys: [['foo', 'bar'], ['bar', 'foo']], values: [{one: 'foo', two: 'bar'}, {one: 'bar', two: 'foo'}]},
    {
      isEqual: utils.isSameValueZero,
      isPromise: false,
      maxSize,
      onCacheAdd: utils.onCacheOperation,
      onCacheChange,
      onCacheHit: utils.onCacheOperation,
      transformKey: undefined
    },
    memoized
  ]);
});

test('if memoize will not fire the onCacheHit method passed with the cache when it is added to', (t) => {
  const fn = (one, two) => {
    return {one, two};
  };
  const onCacheHit = sinon.spy();

  const memoized = memoize(fn, {onCacheHit});

  t.is(memoized.options.onCacheHit, onCacheHit);

  memoized('foo');

  t.true(onCacheHit.notCalled);
});

test('if memoize will fire the onCacheHit method passed with the cache when it is updated', (t) => {
  const fn = (one, two) => {
    return {one, two};
  };
  const onCacheHit = sinon.spy();
  const maxSize = 2;

  const memoized = memoize(fn, {maxSize, onCacheHit});

  t.is(memoized.options.onCacheHit, onCacheHit);

  memoized('foo', 'bar');

  t.true(onCacheHit.notCalled);

  memoized('bar', 'foo');

  t.true(onCacheHit.notCalled);

  memoized('bar', 'foo');

  t.true(onCacheHit.calledOnce);
  t.deepEqual(onCacheHit.args[0], [
    {keys: [['bar', 'foo'], ['foo', 'bar']], values: [{one: 'bar', two: 'foo'}, {one: 'foo', two: 'bar'}]},
    {
      isEqual: utils.isSameValueZero,
      isPromise: false,
      maxSize,
      onCacheAdd: utils.onCacheOperation,
      onCacheChange: utils.onCacheOperation,
      onCacheHit,
      transformKey: undefined
    },
    memoized
  ]);

  memoized('foo', 'bar');

  t.true(onCacheHit.calledTwice);
  t.deepEqual(onCacheHit.args[1], [
    {keys: [['foo', 'bar'], ['bar', 'foo']], values: [{one: 'foo', two: 'bar'}, {one: 'bar', two: 'foo'}]},
    {
      isEqual: utils.isSameValueZero,
      isPromise: false,
      maxSize,
      onCacheAdd: utils.onCacheOperation,
      onCacheChange: utils.onCacheOperation,
      onCacheHit,
      transformKey: undefined
    },
    memoized
  ]);

  memoized('foo', 'bar');

  t.true(onCacheHit.calledThrice);
  t.deepEqual(onCacheHit.args[2], [
    {keys: [['foo', 'bar'], ['bar', 'foo']], values: [{one: 'foo', two: 'bar'}, {one: 'bar', two: 'foo'}]},
    {
      isEqual: utils.isSameValueZero,
      isPromise: false,
      maxSize,
      onCacheAdd: utils.onCacheOperation,
      onCacheChange: utils.onCacheOperation,
      onCacheHit,
      transformKey: undefined
    },
    memoized
  ]);
});

test('if memoize will fire the onCacheAdd method passed with the cache when it is added but not when hit', (t) => {
  const fn = (one, two) => {
    return {one, two};
  };
  const onCacheAdd = sinon.spy();

  const memoized = memoize(fn, {onCacheAdd});

  t.is(memoized.options.onCacheAdd, onCacheAdd);

  memoized('foo');

  t.true(onCacheAdd.calledOnce);

  memoized('foo');

  t.true(onCacheAdd.calledOnce);
});

test('if memoize will fire the onCacheAdd method passed with the cache when it is added but never again', (t) => {
  const fn = (one, two) => {
    return {one, two};
  };
  const onCacheAdd = sinon.spy();
  const maxSize = 2;

  const memoized = memoize(fn, {maxSize, onCacheAdd});

  t.is(memoized.options.onCacheAdd, onCacheAdd);

  memoized('foo', 'bar');

  t.true(onCacheAdd.calledOnce);
  t.deepEqual(onCacheAdd.args[0], [
    {keys: [['foo', 'bar']], values: [{one: 'foo', two: 'bar'}]},
    {
      isEqual: utils.isSameValueZero,
      isPromise: false,
      maxSize,
      onCacheAdd,
      onCacheChange: utils.onCacheOperation,
      onCacheHit: utils.onCacheOperation,
      transformKey: undefined
    },
    memoized
  ]);

  memoized('bar', 'foo');

  t.true(onCacheAdd.calledTwice);
  t.deepEqual(onCacheAdd.args[1], [
    {keys: [['bar', 'foo'], ['foo', 'bar']], values: [{one: 'bar', two: 'foo'}, {one: 'foo', two: 'bar'}]},
    {
      isEqual: utils.isSameValueZero,
      isPromise: false,
      maxSize,
      onCacheAdd,
      onCacheChange: utils.onCacheOperation,
      onCacheHit: utils.onCacheOperation,
      transformKey: undefined
    },
    memoized
  ]);

  memoized('bar', 'foo');

  t.true(onCacheAdd.calledTwice);
  t.deepEqual(onCacheAdd.args[1], [
    {keys: [['bar', 'foo'], ['foo', 'bar']], values: [{one: 'bar', two: 'foo'}, {one: 'foo', two: 'bar'}]},
    {
      isEqual: utils.isSameValueZero,
      isPromise: false,
      maxSize,
      onCacheAdd,
      onCacheChange: utils.onCacheOperation,
      onCacheHit: utils.onCacheOperation,
      transformKey: undefined
    },
    memoized
  ]);

  memoized('foo', 'bar');

  t.true(onCacheAdd.calledTwice);
  t.deepEqual(onCacheAdd.args[1], [
    {keys: [['foo', 'bar'], ['bar', 'foo']], values: [{one: 'foo', two: 'bar'}, {one: 'bar', two: 'foo'}]},
    {
      isEqual: utils.isSameValueZero,
      isPromise: false,
      maxSize,
      onCacheAdd,
      onCacheChange: utils.onCacheOperation,
      onCacheHit: utils.onCacheOperation,
      transformKey: undefined
    },
    memoized
  ]);

  memoized('foo', 'bar');

  t.true(onCacheAdd.calledTwice);
  t.deepEqual(onCacheAdd.args[1], [
    {keys: [['foo', 'bar'], ['bar', 'foo']], values: [{one: 'foo', two: 'bar'}, {one: 'bar', two: 'foo'}]},
    {
      isEqual: utils.isSameValueZero,
      isPromise: false,
      maxSize,
      onCacheAdd,
      onCacheChange: utils.onCacheOperation,
      onCacheHit: utils.onCacheOperation,
      transformKey: undefined
    },
    memoized
  ]);
});

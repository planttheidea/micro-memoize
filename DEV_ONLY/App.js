import React, {PureComponent} from 'react';
import Bluebird from 'bluebird';
import {deepEqual, shallowEqual} from 'fast-equals';

import memoize from '../src';

console.group('standard');

const foo = 'foo';
const bar = 'bar';
const baz = 'baz';

const method = function(one, two) {
  console.log('standard method fired', one, two);

  return [one, two].join(' ');
};

const memoized = memoize(method);

memoized(foo, bar);
memoized(bar, foo);
memoized(bar, foo);
memoized(foo, bar);
memoized(foo, bar);

console.log(memoized.cacheSnapshot);
console.log(memoized.cache);

memoized.cache.keys = [];
memoized.cache.values = [];

console.log(memoized.cacheSnapshot);
console.log(memoized.cache);

console.group('standard with larger cache size');

const memoizedLargerCache = memoize(method, {maxSize: 5});

memoizedLargerCache(foo, bar);
memoizedLargerCache(bar, foo);
memoizedLargerCache(bar, foo);
memoizedLargerCache(foo, bar);
memoizedLargerCache(foo, bar);

console.log(memoizedLargerCache.cacheSnapshot);

console.groupEnd('standard with larger cache size');

console.group('maxArgs');

// limit to testing the first args
const isEqualMaxArgs = (originalKey, newKey) => {
  return originalKey[0] === newKey[0];
};

const memoizedMax = memoize(method, {isEqual: isEqualMaxArgs});

memoizedMax(foo, bar);
memoizedMax(foo, 'baz');

console.groupEnd('maxArgs');

console.group('custom - deep equals');

const deepEqualMethod = ({one, two}) => {
  console.log('custom equal method fired', one, two);

  return [one, two];
};

const deepEqualMemoized = memoize(deepEqualMethod, {
  isEqual: deepEqual
});

deepEqualMemoized({one: 1, two: 2});
deepEqualMemoized({one: 2, two: 1});
deepEqualMemoized({one: 1, two: 2});
deepEqualMemoized({one: 1, two: 2});

console.log(deepEqualMemoized.cacheSnapshot);

console.groupEnd('custom - deep equals');

console.group('promise');

const promiseMethod = (number, otherNumber) => {
  console.log('promise method fired', number);

  return new Promise((resolve) => {
    resolve(number * otherNumber);
  });
};

const promiseMethodRejected = (number) => {
  console.log('promise rejection method fired', number);

  return new Bluebird((resolve, reject) => {
    setTimeout(() => {
      reject(new Error(foo));
    }, 100);
  });
};

const memoizedPromise = memoize(promiseMethod, {isPromise: true});
const memoizedPromiseRejected = memoize(promiseMethodRejected, {isPromise: true});

memoizedPromiseRejected(3)
  .then((value) => {
    console.log(value);
  })
  .catch((error) => {
    console.log(memoizedPromiseRejected.cacheSnapshot);
    console.error(error);
  });

memoizedPromiseRejected(3)
  .then((value) => {
    console.log(value);
  })
  .catch((error) => {
    console.log(memoizedPromiseRejected.cacheSnapshot);
    console.error(error);
  });

memoizedPromiseRejected(3)
  .then((value) => {
    console.log(value);
  })
  .catch((error) => {
    console.log(memoizedPromiseRejected.cacheSnapshot);
    console.error(error);
  });

// get result
memoizedPromise(2, 2).then((value) => {
  console.log(`computed value: ${value}`);
});

// pull from cache
memoizedPromise(2, 2).then((value) => {
  console.log(`cached value: ${value}`);
});

console.log(memoizedPromise.cacheSnapshot.keys);

console.groupEnd('promise');

console.group('with default parameters');

const withDefault = (foo, bar = 'default') => {
  console.log('with default fired', foo, bar);

  return `${foo} ${bar}`;
};
const moizedWithDefault = memoize(withDefault, {maxSize: 5});

console.log(moizedWithDefault(foo));
console.log(moizedWithDefault(foo, bar));
console.log(moizedWithDefault(foo));

console.groupEnd('with default parameters');

console.group('transform key');

const noFns = (one, two, three) => {
  console.log('transform key called');

  return {one, two, three};
};

const memoizedNoFns = memoize(noFns, {
  isEqual(key1, key2) {
    return key1 === key2;
  },
  transformKey(args) {
    return JSON.stringify(args);
  }
});

console.log(memoizedNoFns('one', 'two', function three() {}));
console.log(memoizedNoFns('one', 'two', function four() {}));
console.log(memoizedNoFns('one', 'two', function five() {}));

console.log(memoizedNoFns.cache);

console.groupEnd('transform key');

class App extends PureComponent {
  render() {
    return (
      <div>
        <h1>Check the console</h1>
      </div>
    );
  }
}

export default App;

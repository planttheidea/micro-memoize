import Bluebird from 'bluebird';
import { deepEqual } from 'fast-equals';

import memoize from '../src';
import { __ } from 'ramda';

// import '../benchmarks';

document.body.style.backgroundColor = '#1d1d1d';
document.body.style.color = '#d5d5d5';
document.body.style.margin = '0px';
document.body.style.padding = '0px';

const div = document.createElement('div');

div.textContent = 'Check the console for details.';

document.body.appendChild(div);

console.group('standard');

const foo = 'foo';
const bar = 'bar';
const baz = 'baz';
const quz = 'quz';

const method = function (one: string, two: string) {
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

console.groupEnd();

console.group('standard with larger cache size');

const memoizedLargerCache = memoize(method, {
  onCacheChange(cache) {
    console.log([...cache.keys]);
  },
  maxSize: 3,
});

memoizedLargerCache(foo, bar);
memoizedLargerCache(bar, foo);
memoizedLargerCache(bar, foo);
memoizedLargerCache(foo, baz);
memoizedLargerCache(foo, bar);
memoizedLargerCache(baz, quz);
memoizedLargerCache(foo, quz);

console.log(memoizedLargerCache.cacheSnapshot);

console.groupEnd();

console.group('maxArgs');

// limit to testing the first args
const isMatchingKeyMaxArgs = (
  originalKey: string[],
  newKey: string[],
): boolean => {
  return originalKey[0] === newKey[0];
};

const memoizedMax = memoize(method, { isMatchingKey: isMatchingKeyMaxArgs });

memoizedMax(foo, bar);
memoizedMax(foo, baz);
memoizedMax(foo, quz);

console.groupEnd();

console.group('custom - deep equals');

const deepEqualMethod = ({
  one,
  two,
}: {
  one: string | number;
  two: string | number;
}) => {
  console.log('custom equal method fired', one, two);

  return [one, two];
};

const deepEqualMemoized = memoize(deepEqualMethod, {
  isEqual: deepEqual,
});

deepEqualMemoized({ one: 1, two: 2 });
deepEqualMemoized({ one: 2, two: 1 });
deepEqualMemoized({ one: 1, two: 2 });
deepEqualMemoized({ one: 1, two: 2 });

console.log(deepEqualMemoized.cacheSnapshot);

console.groupEnd();

console.group('promise');

const promiseMethod = (number: number, otherNumber: number) => {
  console.log('promise method fired', number);

  return new Promise((resolve: Function) => {
    resolve(number * otherNumber);
  });
};

const promiseMethodRejected = (number: number) => {
  console.log('promise rejection method fired', number);

  return new Bluebird((resolve, reject) => {
    setTimeout(() => {
      reject(new Error(foo));
    },         100);
  });
};

const memoizedPromise = memoize(promiseMethod, { isPromise: true });
const memoizedPromiseRejected = memoize(promiseMethodRejected, {
  isPromise: true,
});

memoizedPromiseRejected(3)
  .then((value: any) => {
    console.log(value);
  })
  .catch((error: Error) => {
    console.log(memoizedPromiseRejected.cacheSnapshot);
    console.error(error);
  });

memoizedPromiseRejected(3)
  .then((value: any) => {
    console.log(value);
  })
  .catch((error: Error) => {
    console.log(memoizedPromiseRejected.cacheSnapshot);
    console.error(error);
  });

memoizedPromiseRejected(3)
  .then((value: any) => {
    console.log(value);
  })
  .catch((error: Error) => {
    console.log(memoizedPromiseRejected.cacheSnapshot);
    console.error(error);
  });

// get result
memoizedPromise(2, 2).then((value: string) => {
  console.log(`computed value: ${value}`);
});

// pull from cache
memoizedPromise(2, 2).then((value: string) => {
  console.log(`cached value: ${value}`);
});

console.log(memoizedPromise.cacheSnapshot.keys);

console.groupEnd();

console.group('with default parameters');

const withDefault = (foo: string, bar: string = 'default') => {
  console.log('with default fired', foo, bar);

  return `${foo} ${bar}`;
};
'';
const moizedWithDefault = memoize(withDefault, { maxSize: 5 });

console.log(moizedWithDefault(foo));
console.log(moizedWithDefault(foo, bar));
console.log(moizedWithDefault(foo));

console.groupEnd();

console.group('transform key');

const noFns = (one: string, two: string, three: Function) => {
  console.log('transform key called');

  return { one, two, three };
};

const memoizedNoFns = memoize(noFns, {
  isEqual(key1: string, key2: string) {
    return key1 === key2;
  },
  transformKey(args: any) {
    return [JSON.stringify(args)];
  },
});

console.log(memoizedNoFns('one', 'two', function three() {}));
console.log(memoizedNoFns('one', 'two', function four() {}));
console.log(memoizedNoFns('one', 'two', function five() {}));

console.log(memoizedNoFns.cache);

console.groupEnd();

console.group('matching whole key');

const matchingKeyMethod = function (object: {
  deeply: { nested: { number: number } };
}) {
  return object.deeply.nested.number;
};

const matchingKeyMemoized = memoize(matchingKeyMethod, {
  isMatchingKey: deepEqual,
  maxSize: 10,
});

matchingKeyMemoized({ deeply: { nested: { number: 35 } } });
matchingKeyMemoized({ deeply: { nested: { number: 35 } } });
matchingKeyMemoized({ deeply: { nested: { number: 35 } } });
matchingKeyMemoized({ deeply: { nested: { number: 35 } } });
matchingKeyMemoized({ deeply: { nested: { number: 35 } } });

console.log(matchingKeyMemoized.cache);

console.groupEnd();

type Dictionary<Type> = {
  [key: string]: Type;
  [index: number]: Type;
};

const calc = memoize(
  (object: Dictionary<any>, metadata: Dictionary<any>) =>
    Object.keys(object).reduce((totals: Dictionary<any>, key: string) => {
      if (Array.isArray(object[key])) {
        totals[key] = object[key].map((subObject: Dictionary<any>) =>
          calc(subObject, metadata),
        );
      } else {
        totals[key] = object[key].a + object[key].b + metadata.c;
      }

      return totals;
    },                         {}),
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

console.log(result1);
console.log(calc.cacheSnapshot);

const result2 = calc(data, metadata);

console.log(result2);
console.log(calc.cacheSnapshot);

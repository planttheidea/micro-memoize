# micro-memoize

A tiny, crazy [fast](#benchmarks) memoization library for the 95% use-case

## Table of contents

* [Summary](#summary)
* [Usage](#usage)
* [Options](#options)
  * [isEqual](#isequal)
  * [maxSize](#maxsize)
  * [transformKey](#transformkey)
* [Additional properties](#additional-properties)
  * [cache](#cache)
  * [cacheSnapshot](#cachesnapshot)
  * [isMemoized](#ismemoized)
  * [options](#options)
* [Benchmarks](#benchmarks)
  * [Single parameter (primitive only)](#single-parameter-primitive-only)
  * [Single parameter (complex object)](#single-parameter-complex-object)
  * [Multiple parameters (primitives only)](#multiple-parameters-primitives-only)
  * [Multiple parameters (complex objects)](#multiple-parameters-complex-objects)
* [Browser support](#browser-support)
* [Node support](#node-support)
* [Development](#development)

## Summary

As the author of [`moize`](https://github.com/planttheidea/moize), I created a consistently fast memoization library, but `moize` has a lot of features to satisfy a large number of edge cases. `micro-memoize` is a simpler approach, focusing on the core feature set with a much smaller footprint (970 _bytes_ minified+gzipped). Stripping out these edge cases also allows `micro-memoize` to be faster across the board than `moize`.

## Usage

```javascript
// ES2015+
import memoize from 'micro-memoize';

// CommonJS
const memoize = require('micro-memoize').default;

// old-school
const memoize = window.memoize;

const assembleToObject = (one, two) => {
  return {one, two};
};

const memoized = memoize(assembleToObject);

console.log(memoized('one', 'two')); // {one: 'one', two: 'two'}
console.log(memoized('one', 'two')); // pulled from cache, {one: 'one', two: 'two'}
```

## Options

#### isEqual

`function(object1: any, object2: any): boolean`, _defaults to `isSameValueZero`_

Custom method to compare equality of keys, determining whether to pull from cache or not. This operates the same as [`equals`](https://github.com/planttheidea/moize#equals) from `moize`.

Common use-cases:

* Deep equality comparison
* Limiting the arguments compared
* Serialization of arguments

```javascript
import {deepEqual} from 'fast-equals';

const deepObject = (object) => {
  return {
    foo: object.foo,
    bar: object.bar
  };
};

const memoizedDeepObject = memoize(deepObject, {isEqual: deepEqual});

console.log(
  memoizedDeepObject({
    foo: {
      deep: 'foo'
    },
    bar: {
      deep: 'bar'
    },
    baz: {
      deep: 'baz'
    }
  })
); // {foo: {deep: 'foo'}, bar: {deep: 'bar'}}

console.log(
  memoizedDeepObject({
    foo: {
      deep: 'foo'
    },
    bar: {
      deep: 'bar'
    },
    baz: {
      deep: 'baz'
    }
  })
); // pulled from cache
```

**NOTE**: The default method tests for [SameValueZero](http://ecma-international.org/ecma-262/7.0/#sec-samevaluezero) equality, which is summarized as strictly equal while also considering `NaN` equal to `NaN`.

#### maxSize

`number`, _defaults to `1`_

The number of values to store in cache, based on a [Least Recently Used](https://en.wikipedia.org/wiki/Cache_replacement_policies#Least_Recently_Used_.28LRU.29) basis. This operates the same as [`maxSize`](https://github.com/planttheidea/moize#maxsize) on `moize`, with the exception of the default being different.

```javascript
const manyPossibleArgs = (one, two) => {
  return [one, two];
};

const memoized = memoize(manyPossibleArgs, {maxSize: 3});

console.log(memoized('one', 'two')); // ['one', 'two']
console.log(memoized('two', 'three')); // ['two', 'three']
console.log(memoized('three', 'four')); // ['three', 'four']

console.log(memoized('one', 'two')); // pulled from cache
console.log(memoized('two', 'three')); // pulled from cache
console.log(memoized('three', 'four')); // pulled from cache

console.log(memoized('four', 'five')); // ['four', 'five'], drops ['one', 'two'] from cache
```

**NOTE**: The default for `micro-memoize` differs from the default implementation of `moize`. `moize` will store an infinite number of results unless restricted, whereas `micro-memoize` will only store the most recent result. In this way, the default implementation of `micro-memoize` operates more like [`moize.simple`](https://github.com/planttheidea/moize#moizesimple).

#### transformKey

`function(Array<any>): any`

A method that allows you transform the key that is used for caching, if you want to use something other than the pure arguments.

```javascript
const ignoreFunctionArgs = (one, two) => {
  return [one, two];
};

const memoized = memoize(ignoreFunctionArgs, {
  transformKey: JSON.stringify
});

console.log(memoized('one', () => {})); // ['one', () => {}]
console.log(memoized('one', () => {})); // pulled from cache, ['one', () => {}]
```

If your transformed keys require something other than `SameValueZero` equality, you can combine `transformKey` with [`isEqual`](#isequal) for completely custom key creation and comparison.

```javascript
const ignoreFunctionArgs = (one, two) => {
  return [one, two];
};

const memoized = memoize(ignoreFunctionArgs, {
  isEqual(key1, key2) {
    return key1.args === key2.args;
  },
  transformKey(args) {
    return {
      args: JSON.stringify(args)
    };
  }
});

console.log(memoized('one', () => {})); // ['one', () => {}]
console.log(memoized('one', () => {})); // pulled from cache, ['one', () => {}]
```

## Additional properties

#### cache

`Object`

The `cache` object that is used internally. The shape of this structure:

```javascript
{
  keys: Array<Array<any>>, // array of arg arrays
  values: Array<any> // array of values
}
```

The exposure of this object is to allow for manual manipulation of keys/values (injection, removal, expiration, etc).

```javascript
const method = (one, two) => {
  return {one, two};
};

const memoized = memoize(method);

memoized.cache.keys.push(['one', 'two']);
memoized.cache.values.push('cached');

console.log(memoized('one', 'two')); // 'cached'
```

**HOTE**: `moize` offers a variety of convenience methods for this manual `cache` manipulation, and while `micro-memoize` allows all the same capabilities by exposing the `cache`, it does not provide any convenience methods.

#### cacheSnapshot

`Object`

This is identical to the `cache` object referenced above, but it is a deep clone created at request, which will provide a persistent snapshot of the values at that time. This is useful when tracking the cache changes over time, as the `cache` object is mutated internally for performance reasons.

#### isMemoized

`boolean`

Hard-coded to `true` when the function is memoized. This is useful for introspection, to identify if a method has been memoized or not.

#### options

`Object`

The [`options`](#options) passed when creating the memoized method.

## Benchmarks

All values provided are the number of operations per second (ops/sec) calculated by the [Benchmark suite](https://benchmarkjs.com/). Note that `underscore`, `lodash`, and `ramda` do not support mulitple-parameter memoization (which is where `micro-memoize` really shines), so they are not included in those benchmarks.

Each benchmark was performed using the default configuration of the library, with a fibonacci calculation based on the following parameters:

* Single primitive = `35`
* Single object = `{number: 35}`
* Multiple primitives = `35, true`
* Multiple objects = `{number: 35}, {isComplete: true}`

#### Single parameter (primitive only)

This is usually what benchmarks target for ... its the least-likely use-case, but the easiest to optimize, often at the expense of more common use-cases.

|                   | Operations / second | Relative margin of error |
| ----------------- | ------------------- | ------------------------ |
| fast-memoize      | 98,161,022          | 0.77%                    |
| **micro-memoize** | **62,256,972**      | **0.62%**                |
| moize             | 30,230,276          | 0.92%                    |
| lodash            | 28,795,426          | 0.57%                    |
| underscore        | 20,143,898          | 0.83%                    |
| memoizee          | 14,488,076          | 0.62%                    |
| lru-memoize       | 8,290,365           | 0.89%                    |
| Addy Osmani       | 5,949,673           | 0.41%                    |
| memoizerific      | 5,424,207           | 0.69%                    |
| ramda             | 1,123,124           | 0.71%                    |

#### Single parameter (complex object)

This is what most memoization libraries target as the primary use-case, as it removes the complexities of multiple arguments but allows for usage with one to many values.

|                   | Operations / second | Relative margin of error |
| ----------------- | ------------------- | ------------------------ |
| **micro-memoize** | **49,719,450**      | **0.72%**                |
| moize             | 27,195,523          | 0.59%                    |
| lodash            | 22,892,582          | 0.53%                    |
| memoizee          | 9,650,599           | 1.47%                    |
| underscore        | 8,544,163           | 0.64%                    |
| lru-memoize       | 6,818,686           | 0.89%                    |
| memoizerific      | 5,129,356           | 0.68%                    |
| Addy Osmani       | 1,763,456           | 0.63%                    |
| fast-memoize      | 1,354,299           | 0.64%                    |
| ramda             | 210,629             | 0.86%                    |

#### Multiple parameters (primitives only)

This is a very common use-case for function calls, but can be more difficult to optimize because you need to account for multiple possibilities ... did the number of arguments change, are there default arguments, etc.

|                   | Operations / second | Relative margin of error |
| ----------------- | ------------------- | ------------------------ |
| **micro-memoize** | **40,461,050**      | **0.88%**                |
| moize             | 19,480,229          | 0.59%                    |
| memoizee          | 9,293,394           | 0.50%                    |
| lru-memoize       | 6,457,376           | 0.71%                    |
| memoizerific      | 4,046,717           | 0.68%                    |
| Addy Osmani       | 3,137,434           | 0.58%                    |
| fast-memoize      | 1,123,373           | 0.57%                    |

#### Multiple parameters (complex objects)

This is the most robust use-case, with the same complexities as multiple primitives but managing bulkier objects with additional edge scenarios (destructured with defaults, for example).

|                   | Operations / second | Relative margin of error |
| ----------------- | ------------------- | ------------------------ |
| **micro-memoize** | **40,112,733**      | **0.61%**                |
| moize             | 18,240,986          | 0.61%                    |
| memoizee          | 7,357,338           | 0.54%                    |
| lru-memoize       | 6,372,293           | 0.66%                    |
| memoizerific      | 4,363,436           | 0.58%                    |
| Addy Osmani       | 912,491             | 0.64%                    |
| fast-memoize      | 717,827             | 0.61%                    |

## Browser support

* Chrome (all versions)
* Firefox (all versions)
* Edge (all versions)
* Opera 15+
* IE 9+
* Safari 6+
* iOS 8+
* Android 4+

## Node support

* 4+

## Development

Standard stuff, clone the repo and `npm install` dependencies. The npm scripts available:

* `build` => run webpack to build development `dist` file with NODE_ENV=development
* `build:minifed` => run webpack to build production `dist` file with NODE_ENV=production
* `dev` => run webpack dev server to run example app (playground!)
* `dist` => runs `build` and `build-minified`
* `lint` => run ESLint against all files in the `src` folder
* `prepublish` => runs `compile-for-publish`
* `prepublish:compile` => run `lint`, `test`, `transpile:es`, `transpile:lib`, `dist`
* `test` => run AVA test functions with `NODE_ENV=test`
* `test:coverage` => run `test` but with `nyc` for coverage checker
* `test:watch` => run `test`, but with persistent watcher
* `transpile:lib` => run babel against all files in `src` to create files in `lib`
* `transpile:es` => run babel against all files in `src` to create files in `es`, preserving ES2015 modules (for [`pkg.module`](https://github.com/rollup/rollup/wiki/pkg.module))

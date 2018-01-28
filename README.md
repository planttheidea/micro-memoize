# micro-memoize

A tiny, crazy [fast](#benchmarks) memoization library for the 95% use-case

## Table of contents

* [Summary](#summary)
* [Usage](#usage)
* [Options](#options)
  * [isEqual](#isequal)
  * [maxSize](#maxsize)
* [Additional properties](#additional-properties)
  * [cache](#cache)
  * [cacheSnapshot](#cachesnapshot)
  * [isMemoized](#ismemoized)
  * [options](#options)
* [Benchmarks](#benchmarks)
  * [Single parameter](#single-parameter)
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
console.log(memoized('one', 'two')); // pulled from cache => {one: 'one', two: 'two'}
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

This is usually what benchmarks target for ... its the least-likely use-case, but the easiest to optimize, often at the expense of more valid use-cases.

|                   | Operations / second | Relative margin of error |
| ----------------- | ------------------- | ------------------------ |
| fast-memoize      | 96,959,024          | 0.74%                    |
| **micro-memoize** | **57,510,942**      | **0.66%**                |
| moize             | 29,460,085          | 0.83%                    |
| lodash            | 28,973,928          | 0.68%                    |
| underscore        | 19,345,813          | 0.87%                    |
| memoizee          | 15,283,483          | 0.96%                    |
| lru-memoize       | 8,296,286           | 0.75%                    |
| Addy Osmani       | 5,732,939           | 0.69%                    |
| memoizerific      | 5,316,747           | 0.56%                    |
| ramda             | 1,099,910           | 0.69%                    |

#### Single parameter (complex object)

This is what most memoization libraries target as the primary use-case, as it removes the complexities of multiple arguments but allows for usage with one to many values.

|                   | Operations / second | Relative margin of error |
| ----------------- | ------------------- | ------------------------ |
| **micro-memoize** | **45,942,468**      | **0.70%**                |
| moize             | 26,015,006          | 0.70%                    |
| lodash            | 22,151,880          | 0.68%                    |
| memoizee          | 9,546,656           | 0.54%                    |
| underscore        | 8,233,769           | 0.82%                    |
| lru-memoize       | 6,788,336           | 0.79%                    |
| memoizerific      | 4,965,703           | 0.70%                    |
| Addy Osmani       | 1,695,875           | 0.80%                    |
| fast-memoize      | 1,329,404           | 0.66%                    |
| ramda             | 193,824             | 0.94%                    |

#### Multiple parameters (primitives only)

This is a very common use-case for function calls, but can be more difficult to optimize because you need to account for multiple possibilities ... did the number of arguments change, are there default arguments, etc.

|                   | Operations / second | Relative margin of error |
| ----------------- | ------------------- | ------------------------ |
| **micro-memoize** | **37,808,515**      | **0.70%**                |
| moize             | 18,215,090          | 0.65%                    |
| memoizee          | 9,306,676           | 0.66%                    |
| lru-memoize       | 6,117,472           | 0.84%                    |
| memoizerific      | 3,922,988           | 0.67%                    |
| Addy Osmani       | 3,073,420           | 0.71%                    |
| fast-memoize      | 1,081,967           | 0.79%                    |

#### Multiple parameters (complex objects)

This is the most robust use-case, with the same complexities as multiple primitives but managing bulkier objects with additional edge scenarios (destructured with defaults, for example).

|                   | Operations / second | Relative margin of error |
| ----------------- | ------------------- | ------------------------ |
| **micro-memoize** | **36,624,360**      | **0.88%**                |
| moize             | 18,128,088          | 0.87%                    |
| memoizee          | 6,895,779           | 0.66%                    |
| lru-memoize       | 6,021,713           | 0.84%                    |
| memoizerific      | 4,147,039           | 0.79%                    |
| Addy Osmani       | 940,425             | 0.74%                    |
| fast-memoize      | 704,226             | 0.68%                    |

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

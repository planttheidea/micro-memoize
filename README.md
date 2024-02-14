# micro-memoize

A tiny, crazy [fast](#benchmarks) memoization library for the 95% use-case

## Table of contents

- [micro-memoize](#micro-memoize)
  - [Table of contents](#table-of-contents)
  - [Summary](#summary)
  - [Usage](#usage)
    - [Types](#types)
    - [Composition](#composition)
  - [Options](#options)
    - [async](#async)
    - [isArgEqual](#isargequal)
    - [isKeyEqual](#iskeyequal)
    - [maxSize](#maxsize)
    - [transformKey](#transformkey)
  - [Cache](#cache)
    - [Cache events](#cache-events)
      - [New entry added](#new-entry-added)
      - [Existing entry deleted](#existing-entry-deleted)
      - [Most recently used entry found](#most-recently-used-entry-found)
      - [Existing entry found (not most recent)](#existing-entry-found-not-most-recent)
    - [Cache manipulation](#cache-manipulation)
      - [`clear`](#clear)
      - [`delete`](#delete)
      - [`get`](#get)
      - [`has`](#has)
      - [`set`](#set)
    - [Cache entries](#cache-entries)
  - [Additional propeties](#additional-propeties)
    - [memoized.fn](#memoizedfn)
    - [memoized.isMemoized](#memoizedismemoized)
    - [memoized.options](#memoizedoptions)
  - [Benchmarks](#benchmarks)
    - [Single parameter (primitive only)](#single-parameter-primitive-only)
    - [Single parameter (complex object)](#single-parameter-complex-object)
    - [Multiple parameters (primitives only)](#multiple-parameters-primitives-only)
    - [Multiple parameters (complex objects)](#multiple-parameters-complex-objects)
  - [Browser support](#browser-support)
  - [Node support](#node-support)
  - [Development](#development)

## Summary

As the author of [`moize`](https://github.com/planttheidea/moize), I created a consistently fast memoization library, but `moize` has a lot of features to satisfy a large number of edge cases. `micro-memoize` is a simpler approach, focusing on the core feature set with a much smaller footprint (~1.41kB minified+gzipped). Stripping out these edge cases also allows `micro-memoize` to be faster across the board than `moize`.

## Usage

```ts
const assembleToObject = (one: string, two: string) => ({ one, two });

const memoized = memoize(assembleToObject);

console.log(memoized('one', 'two')); // {one: 'one', two: 'two'}
console.log(memoized('one', 'two')); // pulled from cache, {one: 'one', two: 'two'}
```

### Types

If you need them, all types are available under the `MicroMemoize` namespace.

```ts
import { MicroMemoize } from 'micro-memoize';
```

### Composition

Starting in `4.0.0`, you can compose memoized functions if you want to have multiple types of memoized versions based on different options.

```ts
const simple = memoized(fn); // { maxSize: 1 }
const upToFive = memoized(simple, { maxSize: 5 }); // { maxSize: 5 }
const withCustomEquals = memoized(upToFive, { isArgEqual: deepEqual }); // { maxSize: 5, isArgEqual: deepEqual }
```

**NOTE**: The original function is the function used in the composition, the composition only applies to the options. In the example above, `upToFive` does not call `simple`, it calls `fn`.

## Options

### async

`boolean`

Identifies the value returned from the method as a `Promise`, which will result in one of two possible scenarios:

- If the promise is resolved, it will fire the `onCacheHit` and `onCacheChange` options
- If the promise is rejected, it will trigger auto-removal from cache

```ts
const fn = async (one: string, two: string) => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      reject(new Error(JSON.stringify({ one, two })));
    }, 500);
  });
};

const memoized = memoize(fn, { async: true });

memoized('one', 'two');

console.log(memoized.cache.entries()); // [['one', 'two'], Promise]

setTimeout(() => {
  console.log(memoized.cache.entries()); // []
}, 1000);
```

**NOTE**: If you don't want rejections to auto-remove the entry from cache, set `async` to `false` (or simply do not set it), but be aware this will also remove the cache listeners that fire on successful resolution.

### isArgEqual

`function(arg1: any, arg2: any): boolean`, _defaults to `isSameValueZero`_

Custom method to compare equality of keys, determining whether to pull from cache or not, by comparing each argument in order.

Common use-cases:

- Deep equality comparison
- Limiting the arguments compared

```ts
import { deepEqual } from 'fast-equals';

type ContrivedObject = {
  deep: string;
};

const deepObject = (object: {
  foo: ContrivedObject;
  bar: ContrivedObject;
}) => ({
  foo: object.foo,
  bar: object.bar,
});

const memoizedDeepObject = memoize(deepObject, { isArgEqual: deepEqual });

console.log(
  memoizedDeepObject({
    foo: {
      deep: 'foo',
    },
    bar: {
      deep: 'bar',
    },
    baz: {
      deep: 'baz',
    },
  }),
); // {foo: {deep: 'foo'}, bar: {deep: 'bar'}}

console.log(
  memoizedDeepObject({
    foo: {
      deep: 'foo',
    },
    bar: {
      deep: 'bar',
    },
    baz: {
      deep: 'baz',
    },
  }),
); // pulled from cache
```

**NOTE**: The default method tests for [SameValueZero](http://ecma-international.org/ecma-262/7.0/#sec-samevaluezero) equality, which is summarized as strictly equal while also considering `NaN` equal to `NaN`.

### isKeyEqual

`function(existingKey: any[], passedKey: any[]): boolean`

Custom method to compare equality of keys, determining whether to pull from cache or not, by comparing the entire key.

Common use-cases:

- Comparing the shape of the key
- Matching on values regardless of order
- Serialization of arguments

```ts
import { deepEqual } from 'fast-equals';

type ContrivedObject = { foo: string; bar: number };

const deepObject = (object: ContrivedObject) => ({
  foo: object.foo,
  bar: object.bar,
});

const memoizedShape = memoize(deepObject, {
  // receives the full key in cache and the full key of the most recent call
  isKeyEqual(key1, key2) {
    const object1 = key1[0];
    const object2 = key2[0];

    return (
      object1.hasOwnProperty('foo') &&
      object2.hasOwnProperty('foo') &&
      object1.bar === object2.bar
    );
  },
});

console.log(
  memoizedShape({
    foo: 'foo',
    bar: 123,
    baz: 'baz',
  }),
); // {foo: {deep: 'foo'}, bar: {deep: 'bar'}}

console.log(
  memoizedShape({
    foo: 'not foo',
    bar: 123,
    baz: 'baz',
  }),
); // pulled from cache
```

### maxSize

`number`, _defaults to `1`_

The number of values to store in cache, based on a [Least Recently Used](https://en.wikipedia.org/wiki/Cache_replacement_policies#Least_Recently_Used_.28LRU.29) basis. This operates the same as [`maxSize`](https://github.com/planttheidea/moize#maxsize) on `moize`.

```ts
const manyPossibleArgs = (one: string, two: string) => [one, two];

const memoized = memoize(manyPossibleArgs, { maxSize: 3 });

console.log(memoized('one', 'two')); // ['one', 'two']
console.log(memoized('two', 'three')); // ['two', 'three']
console.log(memoized('three', 'four')); // ['three', 'four']

console.log(memoized('one', 'two')); // pulled from cache
console.log(memoized('two', 'three')); // pulled from cache
console.log(memoized('three', 'four')); // pulled from cache

console.log(memoized('four', 'five')); // ['four', 'five'], drops ['one', 'two'] from cache
```

### transformKey

`function(Array<any>): Array<any>`

A method that allows you transform the key that is used for caching, if you want to use something other than the pure arguments.

```ts
const ignoreFunctionArgs = (one: string, two: () => {}) => [one, two];

const memoized = memoize(ignoreFunctionArgs, {
  transformKey: (args) => [JSON.stringify(args[0])],
});

console.log(memoized('one', () => {})); // ['one', () => {}]
console.log(memoized('one', () => {})); // pulled from cache, ['one', () => {}]
```

If your transformed keys require something other than `SameValueZero` equality, you can combine `transformKey` with [`isArgEqual`](#isequal) for completely custom key creation and comparison.

```ts
const ignoreFunctionArg = (one: string, two: () => void) => [one, two];

const memoized = memoize(ignoreFunctionArg, {
  isKeyEqual: (key1, key2) => key1[0] === key2[0],
  // Cache based on the serialized first parameter
  transformKey: (args) => [JSON.stringify(args[0])],
});

console.log(memoized('one', () => {})); // ['one', () => {}]
console.log(memoized('one', () => {})); // pulled from cache, ['one', () => {}]
```

## Cache

Access to the cache memoized function's internal cache is available at `memoized.cache`. It is not recommended to mutate the internals, however there are some exposed methods that can be used for additional capabilities.

### Cache events

Listeners to cache change events can be dynamically added to and removed from the cache for the memoized function.

```ts
const fn = (one: string, two: string) => [one, two];
const memoized = memoize(fn);

memoized.cache.on('add', (event) => {
  console.log('added to cache', event);
});
```

While more narrowly-typed in the implementation, the general shape of all events are:

```ts
interface Event {
  cache: Cache;
  entry: { key: any[]; value: any };
  reason?: string;
  type: string;
}
```

The following events are available:

- `add`: New entry is added to the cache
- `delete`: Existing entry is deleted from the cache
- `hit`: Existing entry was found and was the most recently used entry
- `update`: Existing entry was found but was not the most recent call, and was updated to be the most recently used

Code examples of each are as follows:

#### New entry added

```ts
const fn = (one: string, two: string) => [one, two];
const memoized = memoize(fn, { maxSize: 2 });

memoized.cache.on('add', (event) => {
  console.log('cache entry added: ', cache);
});

memoized('foo', 'bar'); // cache entry added
memoized('foo', 'bar');
memoized('foo', 'bar');

memoized('bar', 'foo'); // cache entry added
memoized('bar', 'foo');
memoized('bar', 'foo');

memoized('foo', 'bar');
memoized('foo', 'bar');
memoized('foo', 'bar');
```

#### Existing entry deleted

#### Most recently used entry found

```ts
const fn = (one: string, two: string) => [one, two];
const memoized = memoize(fn, { maxSize: 2 });

memoized.cache.on('hit', (event) => {
  console.log('cache was hit: ', cache);
});

memoized('foo', 'bar');
memoized('foo', 'bar'); // cache was hit
memoized('foo', 'bar'); // cache was hit

memoized('bar', 'foo');
memoized('bar', 'foo'); // cache was hit
memoized('bar', 'foo'); // cache was hit

memoized('foo', 'bar');
memoized('foo', 'bar'); // cache was hit
memoized('foo', 'bar'); // cache was hit
```

#### Existing entry found (not most recent)

```ts
const fn = (one: string, two: string) => [one, two];
const memoized = memoize(fn, { maxSize: 2 });

memoized.cache.on('update', (event) => {
  console.log('cache entry updated: ', cache);
});

memoized('foo', 'bar');
memoized('foo', 'bar');
memoized('foo', 'bar');

memoized('bar', 'foo');
memoized('bar', 'foo');
memoized('bar', 'foo');

memoized('foo', 'bar'); // cache entry updated
memoized('foo', 'bar');
memoized('foo', 'bar');

memoized('bar', 'foo'); // cache entry updated
memoized('bar', 'foo');
memoized('bar', 'foo');
```

### Cache manipulation

#### `clear`

If you want to clear out the existing cache:

```ts
const fn = (one: string, two: string) => [one, two];
const memoized = memoize(fn);

memoized.cache.clear();
```

#### `delete`

If you want to delete an existing entry in the cache:

```ts
const fn = (one: string, two: string) => one + two;
const memoized = memoize(fn);

memoized('foo', 'bar');

console.log(memoized.cache.get(['foo', 'bar'])); // 'foobar'

memoized.cache.delete(['foo', 'bar']);

console.log(memoized.cache.get(['foo', 'bar'])); // undefined
```

#### `get`

If you want to get a value at an existing key in the cache:

```ts
const fn = (one: string, two: string) => one + two;
const memoized = memoize(fn);

memoized('foo', 'bar');

console.log(memoized.cache.get(['foo', 'bar'])); // 'foobar'
```

Returns `undefined` if the key is not found.

#### `has`

If you want to determine if a key exists in the cache:

```ts
const fn = (one: string, two: string) => one + two;
const memoized = memoize(fn);

memoized('foo', 'bar');

console.log(memoized.cache.get(['foo', 'bar'])); // true
console.log(memoized.cache.get(['bar', 'baz'])); // false
```

#### `set`

If you want to set a value at a key in the cache:

```ts
const fn = (one: string, two: string) => one + two;
const memoized = memoize(fn);

memoized.cache.set(['foo', 'bar'], 'foobar');

console.log(memoized.cache.get(['foo', 'bar'])); // 'foobar'
```

### Cache entries

A snapshot of the entries in cache can be taken at any time, which provides a point-in-time reflection of the values in the cache. Since the values are mutated internally, this can be useful for debugging unexpected behavior based on call dynamics.

```ts
const fn = (one: string, two: string) => one + two;
const memoized = memoize(fn, { maxSize: 2 });

console.log(memoized.cache.entries());
// [];

memoized('foo', 'bar');

console.log(memoized.cache.entries());
// [['foo', 'bar'], 'foobar']

memoized('bar', 'baz');

console.log(memoized.cache.entries());
// [['bar', 'baz'], 'barbaz'], [['foo', 'bar'], 'foobar']]

memoized('foo', 'bar');

console.log(memoized.cache.entries());
// [[['foo', 'bar'], 'foobar'], ['bar', 'baz'], 'barbaz']]
```

## Additional propeties

### memoized.fn

The original function passed to be memoized.

### memoized.isMemoized

Hard-coded to `true` when the function is memoized. This is useful for introspection, to identify if a method has been memoized or not.

### memoized.options

The [`options`](#options) passed when creating the memoized method.

## Benchmarks

All values provided are the number of operations per second (ops/sec) calculated by the [Benchmark suite](https://benchmarkjs.com/). Note that `underscore`, `lodash`, and `ramda` do not support mulitple-parameter memoization (which is where `micro-memoize` really shines), so they are not included in those benchmarks.

Benchmarks was performed on an i9 16-core Arch Linux laptop with 64GB of memory using NodeJS version `18.19.0`. The default configuration of each library was tested with a fibonacci calculation based on the following parameters:

- Single primitive = `35`
- Single object = `{number: 35}`
- Multiple primitives = `35, true`
- Multiple objects = `{number: 35}, {isComplete: true}`

**NOTE**: Not all libraries tested support multiple parameters out of the box, but support the ability to pass a custom `resolver`. Because these often need to resolve to a string value, [a common suggestion](https://github.com/lodash/lodash/issues/2115) is to just `JSON.stringify` the arguments, so that is what is used when needed.

### Single parameter (primitive only)

This is usually what benchmarks target for ... its the least-likely use-case, but the easiest to optimize, often at the expense of more common use-cases.

|                   | Operations / second |
| ----------------- | ------------------- |
| **micro-memoize** | **121,740,174**     |
| fast-memoize      | 110,892,952         |
| mem               | 104,487,931         |
| lru-memoize       | 103,134,780         |
| Addy Osmani       | 71,287,174          |
| underscore        | 60,782,053          |
| lodash            | 56,091,762          |
| ramda             | 49,892,367          |
| memoizee          | 47,142,953          |
| memoizerific      | 18,708,398          |

### Single parameter (complex object)

This is what most memoization libraries target as the primary use-case, as it removes the complexities of multiple arguments but allows for usage with one to many values.

|                   | Operations / second |
| ----------------- | ------------------- |
| **micro-memoize** | **59,189,580**      |
| lodash            | 53,370,488          |
| lru-memoize       | 43,956,168          |
| memoizee          | 27,109,412          |
| memoizerific      | 16,657,400          |
| ramda             | 4,831,034           |
| underscore        | 4,596,231           |
| mem               | 4,159,677           |
| Addy Osmani       | 3,931,473           |
| fast-memoize      | 2,390,688           |

### Multiple parameters (primitives only)

This is a very common use-case for function calls, but can be more difficult to optimize because you need to account for multiple possibilities ... did the number of arguments change, are there default arguments, etc.

|                   | Operations / second |
| ----------------- | ------------------- |
| **micro-memoize** | **47,199,467**      |
| lru-memoize       | 39,757,821          |
| memoizee          | 17,539,760          |
| memoizerific      | 11,917,711          |
| Addy Osmani       | 9,495,702           |
| mem               | 6.334.600           |
| ramda             | 2,408,712           |
| underscore        | 2,359,704           |
| fast-memoize      | 2,173,298           |
| lodash            | 2,148,902           |

### Multiple parameters (complex objects)

This is the most robust use-case, with the same complexities as multiple primitives but managing bulkier objects with additional edge scenarios (destructured with defaults, for example).

|                   | Operations / second |
| ----------------- | ------------------- |
| **micro-memoize** | **44,516,544**      |
| lru-memoize       | 40,112,503          |
| memoizee          | 17,190,427          |
| memoizerific      | 12,216,818          |
| Addy Osmani       | 2,163,630           |
| mem               | 2,136,207           |
| underscore        | 1,427,046           |
| ramda             | 1,414,979           |
| lodash            | 1,349,489           |
| fast-memoize      | 1,246,579           |

## Browser support

- Chrome (all versions)
- Firefox (all versions)
- Edge (all versions)
- Opera 15+
- IE 9+
- Safari 6+
- iOS 8+
- Android 4+

## Node support

- 4+

## Development

Standard stuff, clone the repo and `npm install` dependencies. The npm scripts available:

- `build` => run webpack to build development `dist` file with NODE_ENV=development
- `build:minifed` => run webpack to build production `dist` file with NODE_ENV=production
- `dev` => run webpack dev server to run example app (playground!)
- `dist` => runs `build` and `build-minified`
- `lint` => run ESLint against all files in the `src` folder
- `prepublish` => runs `compile-for-publish`
- `prepublish:compile` => run `lint`, `test`, `transpile:es`, `transpile:lib`, `dist`
- `test` => run AVA test functions with `NODE_ENV=test`
- `test:coverage` => run `test` but with `nyc` for coverage checker
- `test:watch` => run `test`, but with persistent watcher
- `transpile:lib` => run babel against all files in `src` to create files in `lib`
- `transpile:es` => run babel against all files in `src` to create files in `es`, preserving ES2015 modules (for [`pkg.module`](https://github.com/rollup/rollup/wiki/pkg.module))

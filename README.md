# micro-memoize

A [blazing fast](#benchmarks) memoization library that is tiny but feature-rich.

## Table of contents

- [micro-memoize](#micro-memoize)
  - [Table of contents](#table-of-contents)
  - [Importing](#importing)
  - [Usage](#usage)
    - [Types](#types)
    - [Composition](#composition)
  - [Options](#options)
    - [async](#async)
    - [expires](#expires)
    - [forceUpdate](#forceupdate)
    - [isKeyEqual](#iskeyequal)
    - [isKeyItemEqual](#iskeyitemequal)
      - [deep](#deep)
      - [shallow](#shallow)
    - [maxArgs](#maxargs)
    - [maxSize](#maxsize)
    - [serialize](#serialize)
    - [statsName](#statsname)
    - [transformKey](#transformkey)
  - [Additional properties](#additional-properties)
    - [memoized.cache](#memoizedcache)
      - [memoized.cache.clear](#memoizedcacheclear)
      - [memoized.cache.delete(args)](#memoizedcachedeleteargs)
      - [memoized.cache.get(args)](#memoizedcachegetargs)
      - [memoized.cache.has(args)](#memoizedcachehasargs)
      - [memoized.cache.on](#memoizedcacheonname-listener)
        - [add](#add)
        - [delete](#delete)
        - [hit](#hit)
        - [update](#update)
      - [memoized.cache.set(args, value)](#memoizedcachesetargs-value)
      - [memoized.cache.snapshot](#memoizedcachesnapshot)
    - [memoized.fn](#memoizedfn)
    - [memoized.isMemoized](#memoizedismemoized)
    - [memoized.options](#memoizedoptions)
  - [Statistics](#statistics)
    - [clearStats](#clearstats)
    - [getStats([statsName])](#getstatsstatsname)
    - [isCollectingStats](#iscollectingstats)
    - [startCollectingStats](#startcollectingstats)
    - [stopCollectingStats](#stopcollectingstats)
  - [Benchmarks](#benchmarks)
    - [Single primitive parameter](#single-primitive-parameter)
    - [Single array parameter](#single-array-parameter)
    - [Single object parameter](#single-object-parameter)
    - [Multiple primitive parameters](#multiple-primitive-parameters)
    - [Multiple array parameters](#multiple-array-parameters)
    - [Multiple object parameters](#multiple-object-parameters)
  - [Support](#support)
  - [Development](#development)

## Importing

ESM:

```ts
import { memoize } from 'micro-memoize';
```

CommonJS:

```ts
const { memoize } = require('micro-memoize');
```

## Usage

```ts
const toObject = (one: string, two: string) => ({ one, two });

const memoized = memoize(toObject);

console.log(memoized('one', 'two'));
console.log(memoized('one', 'two')); // pulled from cache

// Starting in `4.0.0`, you can compose memoized functions if you want to have multiple types of memoized
// versions based on different options.

const withUpToFive = memoize(memoized, { maxSize: 5 }); // { maxSize: 5 }
const withAsync = memoize(withUpToFive, { async: true }); // { async: true, maxSize: 5 }
const withCustomEquals = memoize(withAsync, { isEqual: deepEqual }); // { async: true, maxSize: 5, isEqual: deepEqual }
```

**NOTE**: The original function is the function used in the composition, the composition only applies to the options. In
the example above, `upToFive` does not call `simple`, it calls `fn`.

## Options

### async

Identifies the value returned from the method as a `Promise`, which will result in one of two possible scenarios:

- If the promise is resolved, it will fire the [hit](#hit) and [update](#update) cache events.
- If the promise is rejected, it will trigger auto-removal from cache as fire the [delete](#delete) cache event.

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

console.log(memoized.cache.snapshot.keys); // [['one', 'two']]
console.log(memoized.cache.snapshot.values); // [Promise]

setTimeout(() => {
  console.log(memoized.cache.snapshot.keys); // []
  console.log(memoized.cache.snapshot.values); // []
}, 1000);
```

**NOTE**: If you don't want rejections to auto-remove the entry from cache, set `async` to `false` (or simply do not set
it), but be aware this will also remove the cache listeners that fire on successful resolution.

### expires

The amount of time in milliseconds that you want a computed value to be stored in cache for this method.

```ts
const fn = (item: Record<string, any>) => item;

const MAX_AGE = 1000 * 60 * 5; // five minutes;

const expiringMemoized = memoize(fn, { expires: MAX_AGE });
```

This can also be dynamic based on the entry, if a method is passed:

```ts
const fn = (item: Record<string, any>) => item;

const expiringMemoized = memoize(fn, {
  expires: (key, value) => shouldExpire(key, value),
});
```

You can also pass a custom configuration to handle conditional expiration.

```ts
const conditionalExpiringMemoized = memoize(fn, {
  expires: {
    after: MAX_AGE,
    shouldPersist: (item) => !item.expires,
    shouldRemove: (item) => item.updatedAt < new Date('2025-01-01').valueOf(),
    update: true,
  },
});
```

**TIP**: A common usage of this is in tandem with `async` for AJAX calls, and in that scenario the expected behavior is
usually to have the `expires` countdown begin upon resolution of the promise. If this is your intended use case, you
should also apply the `update` configuration option.

### forceUpdate

Updates the cache forcibly for a given key when the predicate returns true. This is mainly useful if the function being
memoized has time-based side-effects.

```ts
const fn = (item: string) => item;

let lastUpdate = Date.now();

const memoized = memoize(fn, {
  forceUpdate([item]: [string]) {
    const now = Date.now();
    const last = lastUpdated;

    lastUpdate = now;

    // its been more than 5 minutes since last update
    return last + 300000 < now;
  },
});

memoized('one');
memoized('one'); // pulled from cache

await Promise.resolve(() => setTimeout(resolve, MAX_AGE));

memoized('one'); // re-calls method and updates cache
```

### isKeyEqual

Custom method to compare equality of keys, determining whether to pull from cache or not, by comparing the entire key.

```ts
type Arg = {
  one: string;
  two: null | string;
};

const fn = ({ one, two }: Arg) => [one, two];

const isFooEqualAndHasBar = (cacheKey: [Arg], key: [Arg]) =>
  cacheKey[0].one === key[0].one && cacheKey[1].hasOwnProperty('two') && key[1].hasOwnProperty('two');

const memoized = memoize(fn, { isKeyEqual: isFooEqualAndHasBar });

memoized({ one: 'two' }, { two: null });
memoized({ one: 'two' }, { two: 'three' }); // pulls from cache
```

### isKeyItemEqual

_defaults to [`Object.is`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/is)_

Custom method to compare equality of keys, determining whether to pull from cache or not, by comparing each argument in
order. There are simple string options available for deep / shallow equality comparisons, or you can pass your own
function for custom comparison.

```ts
type Arg = {
    one: {
        nested: string;
    };
    two: string;
};

const fn = ({ one, two }: Arg) => [one, two];

const deepMemoized = memoize(fn, { isKeyItemEqual: 'deep' });

deepMemoized({ one: { nested: 'one' }, two: 'two' });
deepMemoized({ one: { nested: 'one' }, two: 'two' }); // pulls from cache

const shallowMemoized = memoize(fn, { isKeyItemEqual: 'shallow' });

shallowMemoized({ one: 'one', two: 'two' });
shallowMemoized({ one: 'one', two: 'two' }); // pulls from cache

const customMemoized = memoize(fn, {
    isKeyItemEqual: (cacheKeyArg: Arg, keyArg: Arg) =>
        Object.keys(cacheKeyArg).length === 1 && Object.keys(keyArg).length === 1
    }
);

customMemoized({ one: 'two' };
customMemoized({ two: 'three' }); // pulls from cache
```

#### `deep`

Performs a deep equality comparison of each key item using the `deepEqual` method from `fast-equals`.

#### `shallow`

Performs a shallow equality comparison using the `shallowEqual` method from `fast-equals`.

### maxArgs

The maximum number of arguments (starting from the first) used in creating the key for the cache.

```ts
const fn = (item1: string, item2: string, item3: string) => item1 + item2 + item3;

const memoized = memoize(fn, { maxArgs: 2 });

memoize('one', 'two', 'three');
memoize('one', 'two', 'four'); // pulls from cache, as the first two args are the same
```

If `maxArgs` is combined with either `serialize` or `transformKey`, the following order is used:

1.  transform by `transformKey` (if applicable)
1.  limit by `maxArgs`
1.  serialize by `serialize` (if applicable)

### maxSize

_defaults to `1`_

The number of values to store in cache, based on a
[Least Recently Used](https://en.wikipedia.org/wiki/Cache_replacement_policies#Least_Recently_Used_.28LRU.29) basis.
This operates the same as [`maxSize`](https://github.com/planttheidea/memoize#maxsize) on `memoize`.

```ts
const manyPossibleArgs = (one: string, two: string) => [one, two];

const memoized = memoize(manyPossibleArgs, { maxSize: 3 });

memoized.cache.on('delete', (event) => console.log('Deleted from cache: ', event.key));

console.log(memoized('one', 'two')); // ['one', 'two']
console.log(memoized('two', 'three')); // ['two', 'three']
console.log(memoized('three', 'four')); // ['three', 'four']

console.log(memoized('one', 'two')); // pulled from cache
console.log(memoized('two', 'three')); // pulled from cache
console.log(memoized('three', 'four')); // pulled from cache

console.log(memoized('four', 'five')); // ['four', 'five'], Deleted from cache: ['one', 'two']
```

### serialize

Serializes the parameters passed into a string and uses this as the key for cache comparison. If a method is passed
instead of a boolean, it is used as a custom serializer.

```ts
const fn = (mutableObject: { one: Record<string, any> }) => mutableObject.property;

const serializedMemoized = memoize(fn, { serialize: true });
const customSerializedMemoized = memoize(fn, {
  serialize: (args) => [JSON.stringify(args[0])],
});
```

If `serialize` is combined with either `maxArgs` or `transformKey`, the following order is used:

1.  transform by `transformKey` (if applicable)
1.  limit by `maxArgs` (if applicable)
1.  serialize by `serialize`

**NOTE**: This is much slower than the default key storage, and usually the same requirements can be meet with
`isKeyItemEqual: 'deep'`, so use at your discretion.

### statsName

Name to use as unique identifier for the function when collecting statistics. Applying a `statsName` will also activate
stats collection for that method.

```ts
startCollectingStats();

const fn = (item: string) => ({ item });

const memoized = memoize(fn, { statsName: 'my fancy identity' });

memoized('foo');
memoized('foo');
memoized('foo');

console.log(getStats('my fancy identity')); // { calls: 3, hits: 2, name: "my fancy identity", usage: "66.666666%" }
```

### transformKey

Method that allows you transform the key that is used for caching, if you want to use something other than the arguments
passed.

```ts
const ignoreFunctionArgs = (one: string, two: () => {}) => [one, two];

const memoized = memoize(ignoreFunctionArgs, {
  transformKey: (args) => [JSON.stringify(args[0])],
});

console.log(memoized('one', () => {})); // ['one', () => {}]
console.log(memoized('one', () => {})); // pulled from cache, ['one', () => {}]
```

If your transformed keys require something other than
[`SameValueZero`](http://ecma-international.org/ecma-262/7.0/#sec-samevaluezero) equality, you can combine
`transformKey` with [`isKeyEqual`](#iskeyequal) for completely custom key creation and comparison.

```ts
const ignoreFunctionArg = (one: string, two: () => void) => [one, two];

const memoized = memoize(ignoreFunctionArg, {
  isMatchingKey: (key1, key2) => key1[0] === key2[0],
  // Cache based on the serialized first parameter
  transformKey: (args) => [JSON.stringify(args[0])],
});

console.log(memoized('one', () => {})); // ['one', () => {}]
console.log(memoized('one', () => {})); // pulled from cache, ['one', () => {}]
```

If `transformKey` is combined with either `maxArgs` or `serialize`, the following order is used:

1.  transform by `transformKey`
1.  limit by `maxArgs` (if applicable)
1.  serialize by `serialize` (if applicable)

## Additional properties

### memoized.cache

The `cache` object that is used internally. This is a highly-optimized structure, but has several methods for manual
cache manipulation.Direct cache manipulation

The cache is an optimized linked list internally, so working with the cache directly is advised against. However, there
are several exposed ways to introspect or manually manipulate the cache based on common use-cases.

#### memoized.cache.clear()

This will clear all values in the cache, resetting it to an empty state.

```ts
const memoized = memoize((item: string) => item);

memoized.cache.clear();
```

#### memoized.cache.delete(args)

This will remove the key based on the provided `args` from cache. `args` should be an `Array` of values, meant to
reflect the arguments passed to the method.

```ts
const memoized = memoize((item: { one: string }) => item);

const arg = { one: 'one' };

memoized(arg);

memoized.cache.delete([arg]);

// will re-execute, as it is no longer in cache
memoized(arg);
```

**NOTE**: This will only remove `key`s that exist in the cache, and will do nothing if the `key` does not exist.

#### memoized.cache.get(args)

Returns the value in cache if the key based on `args` matches, else returns `undefined`. `args` should be an `Array` of
values, meant to reflect the arguments passed to the method.

```ts
const memoized = memoize((one: string, two: string) => [one, two);

memoized('one', 'two');

console.log(memoized.cache.get(['one', 'two'])); // ["one","two"]
console.log(memoized.cache.get(['two', 'three'])); // undefined
```

#### memoized.cache.has(args)

This will return `true` if a cache entry exists for the key based on the `args` passed, else will return `false`. `args`
should be an `Array` of values, meant to reflect the arguments passed to the method.

```ts
const memoized = memoize((one: string, two: string) => [one, two]);

memoized('one', 'two');

console.log(memoized.cache.has(['one', 'two'])); // true
console.log(memoized.cache.has(['two', 'three'])); // false
```

#### memoized.cache.on(name, listener)

Event listeners are available for different cache events, so that you can monitor cache changes over time.

##### add

Fires when an item has been added to cache. Receives the event:

```ts
interface OnAddEvent<Fn> {
  cache: Cache<Fn>;
  key: Key;
  reason: string | undefined;
  type: 'add';
  value: ReturnType<Fn>;
}
```

Example:

```ts
const fn = (one: string, two: string) => [one, two];

const memoized = memoize(fn, { maxSize: 2 });

memoized.cache.on('add', (event) => {
  console.log(`cache has been added to: ${JSON.stringify(event.key)}`);
});

memoized('foo', 'bar'); // cache has been added to: ["foo","bar"]
memoized('foo', 'bar');
memoized('foo', 'bar');
memoized('bar', 'foo'); // cache has been added to: ["bar","foo"]
memoized('bar', 'foo');
memoized('bar', 'foo');
memoized('foo', 'bar');
memoized('foo', 'bar');
memoized('foo', 'bar');
```

##### delete

Fires when an item has been removed from cache. Receives the event:

```ts
interface OnDeleteEvent<Fn> {
  cache: Cache<Fn>;
  key: Key;
  reason: string | undefined;
  type: 'delete';
  value: ReturnType<Fn>;
}
```

Example:

```ts
const fn = (one: string, two: string) => [one, two];

const memoized = memoize(fn);

memoized.cache.on('delete', (event) => {
  console.log(`cache entry was deleted (${event.reason}): ${JSON.stringify(event.key)}`);
});

memoized('foo', 'bar');
memoized('foo', 'bar');
memoized('foo', 'bar');
memoized('bar', 'foo'); // cache entry was deleted (evicted): ["foo","bar"]
memoized('bar', 'foo');
memoized('bar', 'foo');
memoized('foo', 'bar'); // cache entry was deleted (evicted): ["bar","foo"]
memoized('foo', 'bar');
memoized('foo', 'bar');
```

##### hit

Fires when an item has been found in cache. Receives the event:

```ts
interface OnHitEvent<Fn> {
  cache: Cache<Fn>;
  key: Key;
  reason: string | undefined;
  type: 'hit';
  value: ReturnType<Fn>;
}
```

Example:

```ts
const fn = (one: string, two: string) => [one, two];

const memoized = memoize(fn, { maxSize: 2 });

memoized.cache.on('hit', (event) => {
  console.log(`cache entry found: ${JSON.stringify(event.key)}`);
});

memoized('foo', 'bar');
memoized('foo', 'bar'); // cache entry was found: ["foo","bar"]
memoized('foo', 'bar'); // cache entry was found: ["foo","bar"]
memoized('bar', 'foo');
memoized('bar', 'foo'); // cache entry was found: ["bar","foo"]
memoized('bar', 'foo'); // cache entry was found: ["bar","foo"]
memoized('foo', 'bar'); // cache entry was found: ["foo","bar"]
memoized('foo', 'bar'); // cache entry was found: ["foo","bar"]
memoized('foo', 'bar'); // cache entry was found: ["foo","bar"]
```

##### update

Fires when cache was reordered based on finding an older entry in cache and making it the most recent. Receives the
event:

```ts
interface OnUpdateEvent<Fn> {
  cache: Cache<Fn>;
  key: Key;
  reason: string | undefined;
  type: 'update';
  value: ReturnType<Fn>;
}
```

Example:

```ts
const fn = (one: string, two: string) => [one, two];

const memoized = memoize(fn, { maxSize: 2 });

memoized.cache.on('update', (event) => {
  console.log(`cache has updated: ${JSON.stringify(event.key)}`);
});

memoized('foo', 'bar');
memoized('foo', 'bar');
memoized('bar', 'foo');
memoized('foo', 'bar'); // cache has updated: ["foo","bar"]
memoized('bar', 'foo'); // cache has updated: ["bar","foo"]
memoized('foo', 'bar'); // cache has updated: ["foo","bar"]
memoized('foo', 'bar');
```

#### memoized.cache.set(args, value)

This will manually add the `value` at the key based on `args` in cache if the key does not already exist; if the key
exists, it will update the value. `args` should be an `Array` of values, meant to reflect the arguments passed to the
method.

```ts
// single parameter is straightforward
const memoized = memoize((item: string) => item: string);

memoized.add(['one'], 'two');

// pulls from cache
memoized('one');
```

#### memoized.cache.snapshot

The `cache` is mutated internally for performance reasons, so logging out the cache at a specific step in the workflow
may not give you the information you need. As such, to help with debugging you can request the `cache.snapshot`, which
provides a well-formed snapshot of the cache:

```ts
type CacheSnapshot = {
  entries: Array<[Key, ReturnType<Fn>]>;
  keys: Key[];
  size: number;
  values: Array<ReturnType<Fn>>;
};
```

### memoized.fn

The original function passed to be memoized.

### memoized.isMemoized

Hard-coded to `true` when the function is memoized. This is useful for introspection, to identify if a method has been
memoized or not.

### memoized.options

The [`options`](#options) passed when creating the memoized method.

## Statistics

As-of version 5, you can collect statistics of memoize to determine if your cached methods are effective. To activate
stats collection for a given memoized method, you must provide a [`statsName`](#statsname).

```ts
import { getStats, memoize, startCollectingStats } from 'memoize';

startCollectingStats();

const fn = (one: string, two: string) => [one, two];

const foo = memoize((one: string, two: string) => [one, two], {
  statsName: 'foo',
});
const bar = memoize((one: string, two: string) => `${one} ${two}`, {
  statsName: 'bar',
});
// this will have no stats collected
const baz = memoize((one: string, two: string) => ({ one, two }));

foo('one', 'two');
bar('one', 'two');
foo('one', 'two');
baz('one', 'two');

console.log(getStats('foo'));
/*
{
  "calls": 2,
  "hits": 1,
  "name": "foo",
  "usage": "50.000000%"
}
*/
console.log(getStats());
/*
{
  "calls": 3,
  "hits": 1,
  "profiles: {
    foo: {
      "calls": 2,
      "hits": 1,
      "name": "foo",
      "usage": "50.000000%"
    },
    "bar": {
      "calls": 1,
      "hits": 0,
      "name: "bar",
      "usage": "0.000000%"
    }
  },
  "usage": "33.333333%"
}
*/
```

**NOTE**: It is recommended not to activate this in production, as it has a small (but unnecessary) performance impact.

### clearStats()

Cear statistics on `memoize`d functions.

```ts
clearStats(); // clears all stats
clearStats('stats-name'); // clears stats only for 'stats-name'
```

### getStats(statsName)

Get the statistics for a specific function, or globally.

```ts
startCollectingStats();

const fn = (one: string, two: string) => [one, two];

const memoized = memoize(fn);

const otherFn = (one: string[]) => one.slice(0, 1);

const otherMemoized = memoize(otherFn, { statsName: 'otherMemoized' });

memoized('one', 'two');
memoized('one', 'two');
otherMemoized(['three']);

getStats('otherMemoized');
/*
{
  "calls": 1,
  "hits": 0,
  "name": "otherMemoized",
  "usage": "0.000000%"
}
*/
getStats();
/*
{
  "calls": 3,
  "hits": 1,
  "profiles": {
    "otherMemoized": {
      "calls": 1,
      "hits": 0,
      "name": "otherMemoized",
      "usage": "0.000000%"
    }
  },
  "usage": "33.3333%"
}
*/
```

### isCollectingStats()

Are statistics being collected on memoization usage.

```ts
startCollectingStats();
isCollectingStats(); // true
stopCollectingStats();
isCollectingStats(); // false
```

### startCollectingStats()

Start collecting statistics on `memoize`d functions with defined `statsName` options.

```ts
startCollectingStats();
s;
```

### stopCollectingStats()

Stop collecting statistics on `memoize`d functions with defined `statsName` options.

```ts
stopCollectingStats();
```

## Benchmarks

All values provided are the number of operations per second (ops/sec) calculated by
[tinybench](https://github.com/tinylibs/tinybench). Note that `underscore`, `lodash`, and `ramda` do not support
mulitple-parameter memoization (which is where `micro-memoize` really shines), so they are not included in those
benchmarks.

Benchmarks was performed on an i9 16-core Linux laptop with 64GB of memory using NodeJS version `24.15.0`. The default
configuration of each library was tested with a fibonacci calculation based on the following parameters:

- Single primitive = `25`
- Single array = `[25]`
- Single object = `{ number: 25 }`
- Multiple primitives = `25, false`
- Multiple arrays = `[25], [false]`
- Multiple objects = `{ number: 25 }, { isComplete: false }`

**NOTE**: Not all libraries tested support multiple parameters out of the box, but support the ability to pass a custom
`resolver`. Because these often need to resolve to a string value,
[a common suggestion](https://github.com/lodash/lodash/issues/2115) is to just `JSON.stringify` the arguments, so that
is what is used when needed.

### Single primitive parameter

```bash
┌───────────────┬─────────────────┐
│ Name          │ Ops / sec       │
├───────────────┼─────────────────┤
│ micro-memoize │ 19878405.869513 │
├───────────────┼─────────────────┤
│ lru-memoize   │ 19502821.957062 │
├───────────────┼─────────────────┤
│ fast-memoize  │ 19490029.447615 │
├───────────────┼─────────────────┤
│ mem           │ 19279636.934769 │
├───────────────┼─────────────────┤
│ lodash        │ 15736616.801462 │
├───────────────┼─────────────────┤
│ ramda         │ 15687681.482776 │
├───────────────┼─────────────────┤
│ memoizee      │ 14749369.228334 │
├───────────────┼─────────────────┤
│ addy osmani   │ 14138487.10261  │
├───────────────┼─────────────────┤
│ underscore    │ 13865374.036187 │
├───────────────┼─────────────────┤
│ memoizerific  │ 9199632.446672  │
└───────────────┴─────────────────┘
Fastest was "micro-memoize".

```

### Single array parameter

```bash
┌───────────────┬─────────────────┐
│ Name          │ Ops / sec       │
├───────────────┼─────────────────┤
│ micro-memoize │ 18207906.508748 │
├───────────────┼─────────────────┤
│ lodash        │ 17089753.632004 │
├───────────────┼─────────────────┤
│ lru-memoize   │ 16124168.757351 │
├───────────────┼─────────────────┤
│ memoizee      │ 12625929.637213 │
├───────────────┼─────────────────┤
│ memoizerific  │ 9069719.223337  │
├───────────────┼─────────────────┤
│ mem           │ 5755070.921705  │
├───────────────┼─────────────────┤
│ ramda         │ 5276088.346025  │
├───────────────┼─────────────────┤
│ underscore    │ 4993058.359933  │
├───────────────┼─────────────────┤
│ addy osmani   │ 4441016.626791  │
├───────────────┼─────────────────┤
│ fast-memoize  │ 2956249.282323  │
└───────────────┴─────────────────┘
Fastest was "micro-memoize".

```

### Single object parameter

```bash
┌───────────────┬─────────────────┐
│ Name          │ Ops / sec       │
├───────────────┼─────────────────┤
│ micro-memoize │ 17990445.065827 │
├───────────────┼─────────────────┤
│ lru-memoize   │ 16263269.18489  │
├───────────────┼─────────────────┤
│ lodash        │ 16158739.12453  │
├───────────────┼─────────────────┤
│ memoizee      │ 12375358.726362 │
├───────────────┼─────────────────┤
│ memoizerific  │ 8839399.636506  │
├───────────────┼─────────────────┤
│ mem           │ 4438933.93951   │
├───────────────┼─────────────────┤
│ ramda         │ 4075165.112409  │
├───────────────┼─────────────────┤
│ underscore    │ 3951068.346673  │
├───────────────┼─────────────────┤
│ addy osmani   │ 3355307.945937  │
├───────────────┼─────────────────┤
│ fast-memoize  │ 2557749.132062  │
└───────────────┴─────────────────┘
Fastest was "micro-memoize".

```

### Multiple primitive parameters

```bash
┌───────────────┬─────────────────┐
│ Name          │ Ops / sec       │
├───────────────┼─────────────────┤
│ micro-memoize │ 16661302.548879 │
├───────────────┼─────────────────┤
│ lru-memoize   │ 14879531.883346 │
├───────────────┼─────────────────┤
│ memoizee      │ 9366968.363155  │
├───────────────┼─────────────────┤
│ memoizerific  │ 7445095.654414  │
├───────────────┼─────────────────┤
│ mem           │ 5460720.585562  │
├───────────────┼─────────────────┤
│ addy osmani   │ 4903377.822876  │
├───────────────┼─────────────────┤
│ ramda         │ 4207163.662307  │
├───────────────┼─────────────────┤
│ underscore    │ 4113846.258468  │
├───────────────┼─────────────────┤
│ lodash        │ 3889607.988249  │
├───────────────┼─────────────────┤
│ fast-memoize  │ 2248150.573838  │
└───────────────┴─────────────────┘
Fastest was "micro-memoize".

```

### Multiple array parameters

```bash
┌───────────────┬─────────────────┐
│ Name          │ Ops / sec       │
├───────────────┼─────────────────┤
│ micro-memoize │ 16668684.33111  │
├───────────────┼─────────────────┤
│ lru-memoize   │ 15782769.870912 │
├───────────────┼─────────────────┤
│ memoizee      │ 9092493.003699  │
├───────────────┼─────────────────┤
│ memoizerific  │ 7768681.275842  │
├───────────────┼─────────────────┤
│ mem           │ 4611769.035687  │
├───────────────┼─────────────────┤
│ ramda         │ 3844524.310138  │
├───────────────┼─────────────────┤
│ underscore    │ 3544635.721687  │
├───────────────┼─────────────────┤
│ lodash        │ 3443323.982287  │
├───────────────┼─────────────────┤
│ addy osmani   │ 2732158.515422  │
├───────────────┼─────────────────┤
│ fast-memoize  │ 2071762.315914  │
└───────────────┴─────────────────┘
Fastest was "micro-memoize".

```

### Multiple object parameters

```bash
┌───────────────┬─────────────────┐
│ Name          │ Ops / sec       │
├───────────────┼─────────────────┤
│ micro-memoize │ 14369200.463018 │
├───────────────┼─────────────────┤
│ lru-memoize   │ 14333399.949079 │
├───────────────┼─────────────────┤
│ memoizee      │ 8752485.371029  │
├───────────────┼─────────────────┤
│ memoizerific  │ 6903317.093568  │
├───────────────┼─────────────────┤
│ mem           │ 3005085.159899  │
├───────────────┼─────────────────┤
│ lodash        │ 2624397.394368  │
├───────────────┼─────────────────┤
│ underscore    │ 2385132.287579  │
├───────────────┼─────────────────┤
│ ramda         │ 2372659.444672  │
├───────────────┼─────────────────┤
│ addy osmani   │ 2092282.102868  │
├───────────────┼─────────────────┤
│ fast-memoize  │ 1722392.865214  │
└───────────────┴─────────────────┘
Fastest was "micro-memoize".

```

## Support

- Chrome 47+
- Firefox 43+
- Edge 14s+
- Opera 34+
- Safari 10+
- Node 6+

## Development

Standard stuff, clone the repo and `npm install` dependencies. The npm scripts available:

- `benchmark` => run benchmarks against well-known alternative packages
- `build` => run `rollup` to build the `dist` files
- `build:cjs` => run `rollup` to build the `dist` files specific to CJS requires
- `build:esm` => run `rollup` to build the `dist` files specific to ESM imports
- `build:min` => run `rollup` to build the `dist` files specific to pre-minified files
- `build:umd` => run `rollup` to build the `dist` files specific to legacy environments, such as Node 10
- `clean`: remove `dist` folder
- `clean:cjs`: remove `dist/cjs` folder
- `clean:esm`: remove `dist/esm` folder
- `clean:min`: remove `dist/min` folder
- `clean:umd`: remove `dist/umd` folder
- `dev` => run webpack dev server to run example app (playground!)
- `dist` => runs `build` and `build-minified`
- `lint` => run ESLint against all files in the `src` folder
- `release` => runs the release process, which publishes the latest version of the package
- `release:beta` => runs the beta release process, which publishes the next beta version of the package
- `release:scripts` => run the precursor tasks as part of the release process
- `test` => run unit tests
- `test:coverage` => run `test` but with coverage
- `test:watch` => run `test` but with persistent watcher
- `typecheck` => run `tsc` to verify types are valid

import lodashDeepEqual from 'lodash/isEqual.js';
import lodashMemoize from 'lodash/memoize.js';
import orderBy from 'lodash/orderBy.js';
import { Bench } from 'tinybench';
import Table from 'cli-table2';

import { addOsmaniMemoize } from './addy-osmani.js';
import fastMemoize from 'fast-memoize';
import lru from 'lru-memoize';
import mem from 'mem';
import memoizee from 'memoizee';
import memoizerific from 'memoizerific';
import { memoize } from '../dist/esm/index.mjs';
import { memoizeWith as ramdaMemoize } from 'ramda';
import { memoize as underscoreMemoize } from 'underscore';

function resolveSingleArgument(arg) {
  return typeof arg === 'object' ? JSON.stringify(arg) : arg;
}

function resolveMultipleArguments(...args) {
  return JSON.stringify(args);
}

const lruMemoize = lru.default;

/************* tests *************/

const fibonacciSinglePrimitive = (number) =>
  number < 2
    ? number
    : fibonacciSinglePrimitive(number - 1) +
      fibonacciSinglePrimitive(number - 2);

const fibonacciSingleArray = (array) =>
  array[0] < 2
    ? array[0]
    : fibonacciSingleArray([array[0] - 1]) +
      fibonacciSingleArray([array[0] - 2]);

const fibonacciSingleObject = (object) =>
  object.number < 2
    ? object.number
    : fibonacciSingleObject({ number: object.number - 1 }) +
      fibonacciSingleObject({ number: object.number - 2 });

const fibonacciMultiplePrimitive = (number, isComplete) => {
  if (isComplete) {
    return number;
  }

  const firstValue = number - 1;
  const secondValue = number - 2;

  return (
    fibonacciMultiplePrimitive(firstValue, firstValue < 2) +
    fibonacciMultiplePrimitive(secondValue, secondValue < 2)
  );
};

const fibonacciMultipleArray = (array, check) => {
  if (check[0]) {
    return array[0];
  }

  const firstValue = array[0] - 1;
  const secondValue = array[0] - 2;

  return (
    fibonacciMultipleArray([firstValue], [firstValue < 2]) +
    fibonacciMultipleArray([secondValue], [secondValue < 2])
  );
};

const fibonacciMultipleObject = (object, check) => {
  if (check.isComplete) {
    return object.number;
  }

  const firstValue = object.number - 1;
  const secondValue = object.number - 2;

  return (
    fibonacciMultipleObject(
      { number: firstValue },
      { isComplete: firstValue < 2 },
    ) +
    fibonacciMultipleObject(
      { number: secondValue },
      { isComplete: secondValue < 2 },
    )
  );
};

const fibonacciMultipleDeepEqual = ({ number }) => {
  return number < 2
    ? number
    : fibonacciMultipleDeepEqual({ number: number - 1 }) +
        fibonacciMultipleDeepEqual({ number: number - 2 });
};

/************* benchmarks *************/

const singularPrimitive = {
  'addy osmani': addOsmaniMemoize(fibonacciSinglePrimitive),
  'fast-memoize': fastMemoize(fibonacciSinglePrimitive),
  lodashMemoize: lodashMemoize(fibonacciSinglePrimitive),
  'lru-memoize': lruMemoize(1)(fibonacciSinglePrimitive),
  mem: mem(fibonacciSinglePrimitive),
  memoizee: memoizee(fibonacciSinglePrimitive),
  memoizerific: memoizerific(1)(fibonacciSinglePrimitive),
  'micro-memoize': memoize(fibonacciSinglePrimitive),
  ramda: ramdaMemoize(resolveSingleArgument, fibonacciSinglePrimitive),
  underscore: underscoreMemoize(
    fibonacciSinglePrimitive,
    resolveSingleArgument,
  ),
};

const singularArray = {
  'addy osmani': addOsmaniMemoize(fibonacciSingleArray),
  'fast-memoize': fastMemoize(fibonacciSingleArray),
  lodashMemoize: lodashMemoize(fibonacciSingleArray),
  'lru-memoize': lruMemoize(1)(fibonacciSingleArray),
  mem: mem(fibonacciSingleArray, { cacheKey: JSON.stringify }),
  memoizee: memoizee(fibonacciSingleArray),
  memoizerific: memoizerific(1)(fibonacciSingleArray),
  'micro-memoize': memoize(fibonacciSingleArray),
  ramda: ramdaMemoize(resolveSingleArgument, fibonacciSingleArray),
  underscore: underscoreMemoize(fibonacciSingleArray, resolveSingleArgument),
};

const singularObject = {
  'addy osmani': addOsmaniMemoize(fibonacciSingleObject),
  'fast-memoize': fastMemoize(fibonacciSingleObject),
  lodashMemoize: lodashMemoize(fibonacciSingleObject),
  'lru-memoize': lruMemoize(1)(fibonacciSingleObject),
  mem: mem(fibonacciSingleObject, { cacheKey: JSON.stringify }),
  memoizee: memoizee(fibonacciSingleObject),
  memoizerific: memoizerific(1)(fibonacciSingleObject),
  'micro-memoize': memoize(fibonacciSingleObject),
  ramda: ramdaMemoize(resolveSingleArgument, fibonacciSingleObject),
  underscore: underscoreMemoize(fibonacciSingleObject, resolveSingleArgument),
};

const multiplePrimitive = {
  'addy osmani': addOsmaniMemoize(fibonacciMultiplePrimitive),
  'fast-memoize': fastMemoize(fibonacciMultiplePrimitive),
  lodashMemoize: lodashMemoize(
    fibonacciMultiplePrimitive,
    resolveMultipleArguments,
  ),
  'lru-memoize': lruMemoize(1)(fibonacciMultiplePrimitive),
  mem: mem(fibonacciMultiplePrimitive, { cacheKey: JSON.stringify }),
  memoizee: memoizee(fibonacciMultiplePrimitive),
  memoizerific: memoizerific(1)(fibonacciMultiplePrimitive),
  'micro-memoize': memoize(fibonacciMultiplePrimitive),
  ramda: ramdaMemoize(resolveMultipleArguments, fibonacciMultiplePrimitive),
  underscore: underscoreMemoize(
    fibonacciMultiplePrimitive,
    resolveMultipleArguments,
  ),
};

const multipleArray = {
  'addy osmani': addOsmaniMemoize(fibonacciMultipleArray),
  'fast-memoize': fastMemoize(fibonacciMultipleArray),
  lodashMemoize: lodashMemoize(
    fibonacciMultipleArray,
    resolveMultipleArguments,
  ),
  'lru-memoize': lruMemoize(1)(fibonacciMultipleArray),
  mem: mem(fibonacciMultipleArray, { cacheKey: JSON.stringify }),
  memoizee: memoizee(fibonacciMultipleArray),
  memoizerific: memoizerific(1)(fibonacciMultipleArray),
  'micro-memoize': memoize(fibonacciMultipleArray),
  ramda: ramdaMemoize(resolveMultipleArguments, fibonacciMultipleArray),
  underscore: underscoreMemoize(
    fibonacciMultipleArray,
    resolveMultipleArguments,
  ),
};

const multipleObject = {
  'addy osmani': addOsmaniMemoize(fibonacciMultipleObject),
  'fast-memoize': fastMemoize(fibonacciMultipleObject),
  lodashMemoize: lodashMemoize(
    fibonacciMultipleObject,
    resolveMultipleArguments,
  ),
  'lru-memoize': lruMemoize(1)(fibonacciMultipleObject),
  mem: mem(fibonacciMultipleObject, { cacheKey: JSON.stringify }),
  memoizee: memoizee(fibonacciMultipleObject),
  memoizerific: memoizerific(1)(fibonacciMultipleObject),
  'micro-memoize': memoize(fibonacciMultipleObject),
  ramda: ramdaMemoize(resolveMultipleArguments, fibonacciMultipleObject),
  underscore: underscoreMemoize(
    fibonacciMultipleObject,
    resolveMultipleArguments,
  ),
};

const number = 25;
const arrayNumber = [number];
const objectNumber = { number };

const isComplete = false;
const arrayIsComplete = [isComplete];
const objectIsComplete = { isComplete };

const benches = {
  'singular primitive': { methods: singularPrimitive, args: [number] },
  'singular array': { methods: singularArray, args: [arrayNumber] },
  'singular object': { methods: singularObject, args: [objectNumber] },
  'multiple primitive': {
    methods: multiplePrimitive,
    args: [number, isComplete],
  },
  'multiple array': {
    methods: multipleArray,
    args: [arrayNumber, arrayIsComplete],
  },
  'multiple object': {
    methods: multipleObject,
    args: [objectNumber, objectIsComplete],
  },
};

function getResults(tasks) {
  const table = new Table({
    head: ['Name', 'Ops / sec'],
  });

  tasks.forEach(({ name, result }) => {
    table.push([name, +result.throughput.mean.toFixed(6)]);
  });

  return table.toString();
}

async function run(name, { args, methods }) {
  console.log('');
  console.log(`Testing ${name}...`);

  const bench = new Bench({ iterations: 1000, name, time: 100 });

  Object.entries(methods).forEach(([pkgName, fn]) => {
    bench.add(pkgName, () => {
      fn.apply(null, args);
    });
  });

  await bench.run();

  const tasks = orderBy(
    bench.tasks.filter(({ result }) => result),
    ({ result }) => result.throughput.mean,
    ['desc'],
  );
  const table = getResults(tasks);

  console.log(table);
  console.log(`Fastest was "${tasks[0].name}".`);
}

async function runAlternativeOptions() {
  console.log('');
  console.log('Testing alternative options...');

  const bench = new Bench({
    iterations: 1000,
    name: 'alternative options',
    time: 100,
  });

  const memoizedDeep = memoize(fibonacciMultipleDeepEqual, {
    isKeyItemEqual: 'deep',
  });
  const memoizedDeepLodash = memoize(fibonacciMultipleDeepEqual, {
    isKeyItemEqual: lodashDeepEqual,
  });
  const memoizedSerialized = memoize(fibonacciMultipleDeepEqual, {
    serialize: true,
  });
  const memoizedTransformKey = memoize((foo, _bar, baz) => [foo, baz], {
    transformKey: (args) => {
      const newKey = [];
      let index = args.length;

      while (--index) {
        newKey[index - 1] = args[index];
      }

      return newKey;
    },
  });
  const memoizedMaxArgs = memoize((one, two, three) => [one, two, three], {
    maxArgs: 2,
  });

  bench.add('serialized', () => {
    memoizedSerialized({ number: 35 });
  });
  bench.add('deep equals (native)', () => {
    memoizedDeep({ number: 35 });
  });
  bench.add('custom equals (lodash isEqual)', () => {
    memoizedDeepLodash({ number: 35 });
  });
  bench.add('transform key', () => {
    memoizedTransformKey('foo', { foo: 'bar' }, ['baz']);
  });
  bench.add('max args', () => {
    memoizedMaxArgs('foo', { foo: 'bar' }, ['baz']);
  });

  await bench.run();

  const tasks = orderBy(
    bench.tasks.filter(({ result }) => result),
    ({ result }) => result.throughput.mean,
    ['desc'],
  );
  const table = getResults(tasks);

  console.log(table);
  console.log(`Fastest was "${tasks[0].name}".`);
}

for (const type in benches) {
  await run(type, benches[type]);
}

await runAlternativeOptions();

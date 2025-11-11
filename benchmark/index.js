import lodash from 'lodash/memoize.js';
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
import { memoizeWith } from 'ramda';
import { memoize as underscore } from 'underscore';

const resolveArguments = function () {
  return arguments.length > 1
    ? JSON.stringify(arguments)
    : typeof arguments[0] === 'object'
      ? JSON.stringify(arguments[0])
      : arguments[0];
};

const lruMemoize = lru.default;
const ramda = memoizeWith(resolveArguments);

const getResults = (results) => {
  const table = new Table({
    head: ['Name', 'Ops / sec'],
  });

  results.forEach(({ name, stats }) => {
    table.push([name, stats.ops.toLocaleString()]);
  });

  return table.toString();
};

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

/************* benchmarks *************/

const singularPrimitive = {
  'addy osmani': addOsmaniMemoize(fibonacciSinglePrimitive),
  'fast-memoize': fastMemoize(fibonacciSinglePrimitive),
  lodash: lodash(fibonacciSinglePrimitive),
  'lru-memoize': lruMemoize(1)(fibonacciSinglePrimitive),
  mem: mem(fibonacciSinglePrimitive),
  memoizee: memoizee(fibonacciSinglePrimitive),
  memoizerific: memoizerific(1)(fibonacciSinglePrimitive),
  'micro-memoize': memoize(fibonacciSinglePrimitive),
  ramda: ramda(fibonacciSinglePrimitive),
  underscore: underscore(fibonacciSinglePrimitive),
};

const singularArray = {
  'addy osmani': addOsmaniMemoize(fibonacciSingleArray),
  'fast-memoize': fastMemoize(fibonacciSingleArray),
  lodash: lodash(fibonacciSingleArray),
  'lru-memoize': lruMemoize(1)(fibonacciSingleArray),
  mem: mem(fibonacciSingleArray, { cacheKey: JSON.stringify }),
  memoizee: memoizee(fibonacciSingleArray),
  memoizerific: memoizerific(1)(fibonacciSingleArray),
  'micro-memoize': memoize(fibonacciSingleArray),
  ramda: ramda(fibonacciSingleArray),
  underscore: underscore(fibonacciSingleArray, resolveArguments),
};

const singularObject = {
  'addy osmani': addOsmaniMemoize(fibonacciSingleObject),
  'fast-memoize': fastMemoize(fibonacciSingleObject),
  lodash: lodash(fibonacciSingleObject),
  'lru-memoize': lruMemoize(1)(fibonacciSingleObject),
  mem: mem(fibonacciSingleObject, { cacheKey: JSON.stringify }),
  memoizee: memoizee(fibonacciSingleObject),
  memoizerific: memoizerific(1)(fibonacciSingleObject),
  'micro-memoize': memoize(fibonacciSingleObject),
  ramda: ramda(fibonacciSingleObject),
  underscore: underscore(fibonacciSingleObject, resolveArguments),
};

const multiplePrimitive = {
  'addy osmani': addOsmaniMemoize(fibonacciMultiplePrimitive),
  'fast-memoize': fastMemoize(fibonacciMultiplePrimitive),
  lodash: lodash(fibonacciMultiplePrimitive, resolveArguments),
  'lru-memoize': lruMemoize(1)(fibonacciMultiplePrimitive),
  mem: mem(fibonacciMultiplePrimitive, { cacheKey: JSON.stringify }),
  memoizee: memoizee(fibonacciMultiplePrimitive),
  memoizerific: memoizerific(1)(fibonacciMultiplePrimitive),
  'micro-memoize': memoize(fibonacciMultiplePrimitive),
  ramda: ramda(fibonacciMultiplePrimitive),
  underscore: underscore(fibonacciMultiplePrimitive, resolveArguments),
};

const multipleArray = {
  'addy osmani': addOsmaniMemoize(fibonacciMultipleArray),
  'fast-memoize': fastMemoize(fibonacciMultipleArray),
  lodash: lodash(fibonacciMultipleArray, resolveArguments),
  'lru-memoize': lruMemoize(1)(fibonacciMultipleArray),
  mem: mem(fibonacciMultipleArray, { cacheKey: JSON.stringify }),
  memoizee: memoizee(fibonacciMultipleArray),
  memoizerific: memoizerific(1)(fibonacciMultipleArray),
  'micro-memoize': memoize(fibonacciMultipleArray),
  ramda: ramda(fibonacciMultipleArray),
  underscore: underscore(fibonacciMultipleArray, resolveArguments),
};

const multipleObject = {
  'addy osmani': addOsmaniMemoize(fibonacciMultipleObject),
  'fast-memoize': fastMemoize(fibonacciMultipleObject),
  lodash: lodash(fibonacciMultipleObject, resolveArguments),
  'lru-memoize': lruMemoize(1)(fibonacciMultipleObject),
  mem: mem(fibonacciMultipleObject, { cacheKey: JSON.stringify }),
  memoizee: memoizee(fibonacciMultipleObject),
  memoizerific: memoizerific(1)(fibonacciMultipleObject),
  'micro-memoize': memoize(fibonacciMultipleObject),
  ramda: ramda(fibonacciMultipleObject),
  underscore: underscore(fibonacciMultipleObject, resolveArguments),
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

  console.table(
    tasks.map(({ name, result }) => ({
      Package: name.replace(' (passed)', ''),
      'Ops/sec': +result.throughput.mean.toFixed(6),
    })),
  );
  console.log(`Fastest was "${tasks[0].name}".`);
}

for (const type in benches) {
  await run(type, benches[type]);
}

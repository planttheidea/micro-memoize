// test
import test from 'ava';

// src
import * as utils from 'src/utils';

test('if areKeysEqual will return false when the length of the keys are different', (t) => {
  const isEqual = (o1, o2) => {
    return o1 === o2;
  };

  const areKeysEqual = utils.createAreKeysEqual(isEqual);

  const keys1 = [];
  const keys2 = ['key'];

  t.false(areKeysEqual(keys1, keys2));
});

test('if areKeysEqual will return false when the keys have different values', (t) => {
  const isEqual = (o1, o2) => {
    return o1 === o2;
  };

  const areKeysEqual = utils.createAreKeysEqual(isEqual);

  const keys1 = ['key'];
  const keys2 = ['other key'];

  t.false(areKeysEqual(keys1, keys2));
});

test('if areKeysEqual will return true when the keys have equal values', (t) => {
  const isEqual = (o1, o2) => {
    return o1 === o2;
  };

  const areKeysEqual = utils.createAreKeysEqual(isEqual);

  const keys1 = ['key'];
  const keys2 = ['key'];

  t.true(areKeysEqual(keys1, keys2));
});

test('if getKeyIndex will return the index of the match found', (t) => {
  const isEqual = (o1, o2) => {
    return o1 === o2;
  };

  const getKeyIndex = utils.createGetKeyIndex(isEqual);

  const allKeys = [['key'], ['other key']];
  const keysToMatch = ['other key'];

  const result = getKeyIndex(allKeys, keysToMatch);

  t.is(result, 1);
});

test('if getKeyIndex will return -1 if no match is found', (t) => {
  const isEqual = (o1, o2) => {
    return o1 === o2;
  };

  const getKeyIndex = utils.createGetKeyIndex(isEqual);

  const allKeys = [['key'], ['other key']];
  const keysToMatch = ['not present key'];

  const result = getKeyIndex(allKeys, keysToMatch);

  t.is(result, -1);
});

test('if isSameValueZero will return true when the objects are equal', (t) => {
  const object1 = {};
  const object2 = object1;

  t.true(utils.isSameValueZero(object1, object2));
});

test('if isSameValueZero will return true when the objects are both NaN', (t) => {
  const object1 = NaN;
  const object2 = NaN;

  t.true(utils.isSameValueZero(object1, object2));
});

test('if isSameValueZero will return false when the objects are different', (t) => {
  const object1 = {};
  const object2 = {};

  t.false(utils.isSameValueZero(object1, object2));
});

test('if orderByLru will do nothing if the itemIndex is 0', (t) => {
  const array = ['first', 'second', 'third'];
  const itemIndex = 0;

  utils.orderByLru(array, itemIndex);

  t.deepEqual(array, ['first', 'second', 'third']);
});

test('if orderByLru will place the itemIndex first in order when non-zero', (t) => {
  const array = ['first', 'second', 'third'];
  const itemIndex = 1;

  utils.orderByLru(array, itemIndex);

  t.deepEqual(array, ['second', 'first', 'third']);
});

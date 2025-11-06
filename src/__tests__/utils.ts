import { describe, expect, it } from 'vitest';
import { isSameValueZero } from '../utils.js';

describe('isSameValueZero', () => {
  it('will return true when the objects are equal', () => {
    const object1 = {};
    const object2 = object1;

    expect(isSameValueZero(object1, object2)).toEqual(true);
  });

  it('will return true when the objects are NaN', () => {
    const object1 = NaN;
    const object2 = NaN;

    expect(isSameValueZero(object1, object2)).toEqual(true);
  });

  it('will return false when the objects are different', () => {
    const object1 = {};
    const object2 = {};

    expect(isSameValueZero(object1, object2)).toEqual(false);
  });
});

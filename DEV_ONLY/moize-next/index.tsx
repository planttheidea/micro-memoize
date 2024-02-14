import moize, { collectStats, getStats } from './moize';

document.body.style.backgroundColor = '#1d1d1d';
document.body.style.color = '#d5d5d5';
document.body.style.margin = '0px';
document.body.style.padding = '0px';

const moized = moize(
  (one: string, two: string, three) => ({ one, two, three }),
  {
    expiresAfter: 2000,
    maxArgs: 2,
    maxSize: 2,
    onExpire(entry) {
      console.log('expired', entry[0]);
    },
    rescheduleExpiration: true,
    profileName: 'test',
    serialize: true,
    transformKey(key) {
      console.log({ key });
      return [...key].reverse();
    },
  },
);

collectStats();

moized.cache.on('delete', (event) => {
  console.log('deleted', event.cache.oh);
});

console.log(moized('one', 'two', 'three'));
console.log(moized('one', 'three', 'two'));
console.log(moized('two', 'three', 'one'));
console.log(moized('one', 'two', 'three'));
console.log(moized('one', 'two', 'three'));
console.log(moized('one', 'two', 'three'));
console.log(moized('one', 'two', 'three'));
console.log(moized('one', 'two', 'three'));
console.log(moized('one', 'two', 'three'));
console.log(moized('one', 'two', 'three'));
console.log(moized('one', 'two', 'three'));
console.log(moized('one', 'two', 'three'));
console.log(moized('one', 'two', 'three'));
console.log(moized('one', 'two', 'three'));
console.log(moized('one', 'two', 'three'));
console.log(moized('one', 'two', 'three'));

console.log(moized.cache.oh);
console.log(moized.cache.entries());

moized.cache.delete(['two', 'three', 'bunk']);

console.log(moized.cache.entries());
console.log(getStats('test'));

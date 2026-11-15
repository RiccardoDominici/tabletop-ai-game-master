import { describe, expect, it } from 'vitest';
import { numeriDettati, valoriDettati } from './numeriDettati';

describe('dice values in a dictated sentence', () => {
  it('digits and Italian words, articles are not a 1', () => {
    expect(numeriDettati('Ho fatto 14')).toEqual([14]);
    expect(numeriDettati('ho fatto un 14')).toEqual([14]);
    expect(numeriDettati('quattordici e tre')).toEqual([14, 3]);
    expect(numeriDettati('ventuno, trentotto, venti, cento')).toEqual([21, 38, 20, 100]);
    expect(numeriDettati('È uscito diciassette')).toEqual([17]);
  });

  it('English words', () => {
    expect(numeriDettati('I rolled a nineteen')).toEqual([19]);
    expect(numeriDettati('twenty-one and seven')).toEqual([21, 7]);
    expect(numeriDettati('an eleven')).toEqual([11]);
  });

  it('the values for a request: as many dice as asked, each within its faces', () => {
    expect(valoriDettati('ho fatto 14', 1, 20)).toEqual([14]);
    expect(valoriDettati('4 e 13', 2, 20)).toEqual([4, 13]);
    expect(valoriDettati('ho fatto 14', 2, 20)).toBeNull();
    // A 25 is not a d20: skipped.
    expect(valoriDettati('25, no, 15', 1, 20)).toEqual([15]);
    expect(valoriDettati('settantatre', 1, 100)).toEqual([73]);
    expect(valoriDettati('niente', 1, 20)).toBeNull();
  });
});

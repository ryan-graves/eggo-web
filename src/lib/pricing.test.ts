import { formatUsd, getMarketValue, getSetValue } from './pricing';
import type { LegoSet } from '@/types';

type PricedSet = Pick<LegoSet, 'status' | 'retailPrice' | 'marketValueNew' | 'marketValueUsed'>;

function priced(overrides: Partial<PricedSet> = {}): PricedSet {
  return {
    status: 'assembled',
    retailPrice: 109.99,
    marketValueNew: 230,
    marketValueUsed: 126,
    ...overrides,
  };
}

describe('getMarketValue', () => {
  it('uses the new price while a set is unopened', () => {
    expect(getMarketValue(priced({ status: 'unopened' }))).toEqual({
      amount: 230,
      condition: 'new',
    });
  });

  it('uses the used price once a set is opened, whatever its build state', () => {
    for (const status of [
      'in_progress',
      'rebuild_in_progress',
      'assembled',
      'disassembled',
    ] as const) {
      expect(getMarketValue(priced({ status }))).toEqual({ amount: 126, condition: 'used' });
    }
  });

  it('has no market value when the price for that condition is missing', () => {
    expect(getMarketValue(priced({ marketValueUsed: undefined }))).toBeNull();
    expect(getMarketValue(priced({ status: 'unopened', marketValueNew: undefined }))).toBeNull();
  });
});

describe('getSetValue', () => {
  it('prefers the market value', () => {
    expect(getSetValue(priced())).toEqual({ amount: 126, basis: 'used' });
  });

  it('falls back to retail when there is no market value', () => {
    expect(getSetValue(priced({ marketValueNew: undefined, marketValueUsed: undefined }))).toEqual({
      amount: 109.99,
      basis: 'retail',
    });
  });

  it('counts a zero market value as a value', () => {
    expect(getSetValue(priced({ marketValueUsed: 0 }))).toEqual({ amount: 0, basis: 'used' });
  });

  it('is null when the set has no prices', () => {
    expect(
      getSetValue({
        status: 'assembled',
        retailPrice: undefined,
        marketValueNew: undefined,
        marketValueUsed: undefined,
      })
    ).toBeNull();
  });
});

describe('formatUsd', () => {
  it('shows cents only when there are some', () => {
    expect(formatUsd(109.99)).toBe('$109.99');
    expect(formatUsd(1088)).toBe('$1,088');
  });

  it('rounds to the dollar for totals', () => {
    expect(formatUsd(8912.8, { wholeDollars: true })).toBe('$8,913');
  });
});

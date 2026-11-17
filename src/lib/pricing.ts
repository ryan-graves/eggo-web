import type { LegoSet } from '@/types';

type PricedSet = Pick<LegoSet, 'status' | 'retailPrice' | 'marketValueNew' | 'marketValueUsed'>;

export interface MarketValue {
  amount: number;
  /** Sealed sets sell as new, everything else as used. */
  condition: 'new' | 'used';
}

export interface SetValue {
  amount: number;
  basis: MarketValue['condition'] | 'retail';
}

/** The BrickLink value for the set's condition: new while unopened, used once opened. */
export function getMarketValue(set: PricedSet): MarketValue | null {
  const condition = set.status === 'unopened' ? 'new' : 'used';
  const amount = condition === 'new' ? set.marketValueNew : set.marketValueUsed;
  return amount === undefined ? null : { amount, condition };
}

/**
 * What a set is worth today: its market value, or its original retail price
 * when there's no market value yet (sets LEGO still sells have no BrickLink
 * average), or null when Eggo has no price for it at all.
 */
export function getSetValue(set: PricedSet): SetValue | null {
  const market = getMarketValue(set);
  if (market) return { amount: market.amount, basis: market.condition };
  if (set.retailPrice !== undefined) return { amount: set.retailPrice, basis: 'retail' };
  return null;
}

const USD = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
const USD_WHOLE = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

/**
 * "$109.99", or "$126" for a whole-dollar amount. `wholeDollars` rounds to
 * the dollar, for totals.
 */
export function formatUsd(amount: number, { wholeDollars = false } = {}): string {
  return wholeDollars || Number.isInteger(amount) ? USD_WHOLE.format(amount) : USD.format(amount);
}

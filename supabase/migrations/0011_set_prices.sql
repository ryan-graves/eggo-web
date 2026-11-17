-- ============================================================================
-- 0011 — set prices
--
-- Each set can carry two kinds of price, both in US dollars:
--
--   * retail_price_usd — LEGO's original US retail price. Brickset's getSets
--     records include it (LEGOCom.US.retailPrice), so the add-set form and the
--     Brickset import fill it in when a set is created.
--   * market_value_new_usd / market_value_used_usd — what the set sells for
--     on BrickLink, sealed and opened. Brickset's API doesn't carry these, so
--     they arrive as a snapshot, stamped with market_values_updated_at.
--
-- The app values a set at its new price while it's unopened and its used
-- price otherwise, falling back to retail when there's no market value (sets
-- LEGO still sells have no BrickLink average yet). See src/lib/pricing.ts.
--
-- No new RLS policies: the existing "sets" policies cover every column.
-- ============================================================================

alter table public.sets
  add column if not exists retail_price_usd numeric(10, 2)
    check (retail_price_usd is null or retail_price_usd >= 0),
  add column if not exists market_value_new_usd numeric(10, 2)
    check (market_value_new_usd is null or market_value_new_usd >= 0),
  add column if not exists market_value_used_usd numeric(10, 2)
    check (market_value_used_usd is null or market_value_used_usd >= 0),
  add column if not exists market_values_updated_at timestamptz;

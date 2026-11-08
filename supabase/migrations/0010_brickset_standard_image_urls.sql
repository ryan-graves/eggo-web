-- ============================================================================
-- 0010 — point stored Brickset image URLs at the rendition every set has
--
-- Eggo used to rewrite every Brickset set image to its /sets/large/ rendition
-- before storing it. Large images only exist for newer sets; for older ones
-- (e.g. 6339 Shuttle Launch Pad, 1995) that URL 404s, so any set without a
-- processed image showed a broken picture. The app now stores the standard
-- /sets/images/ URL, which exists for every set, and tries the large sibling
-- only at background-removal time (src/lib/providers/bricksetMapping.ts).
--
-- This rewrites existing rows to match. It touches only image_url (the raw
-- fallback); custom_image_url, the processed picture cards actually show, is
-- untouched. Idempotent: rows already on /sets/images/ don't match.
-- ============================================================================

update public.sets
set image_url = replace(image_url, '/sets/large/', '/sets/images/')
where image_url like 'https://images.brickset.com/sets/large/%';

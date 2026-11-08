/**
 * Script-side mirror of src/lib/image/trimTransparent.ts, so the maintenance
 * scripts can run without a Next.js build. Keep the two in step.
 */
import sharp from 'sharp';

const ALPHA_THRESHOLD = 8;
const PADDING_RATIO = 0.04;

export async function trimTransparentMargins(png) {
  const { data, info } = await sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let minX = info.width;
  let minY = info.height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < info.height; y++) {
    const rowStart = y * info.width * 4;
    for (let x = 0; x < info.width; x++) {
      if (data[rowStart + x * 4 + 3] > ALPHA_THRESHOLD) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0) return { png, trimmed: false, removedRatio: 0 };
  const bounds = { left: minX, top: minY, width: maxX - minX + 1, height: maxY - minY + 1 };
  const fillsCanvas =
    bounds.left === 0 &&
    bounds.top === 0 &&
    bounds.width === info.width &&
    bounds.height === info.height;
  if (fillsCanvas) return { png, trimmed: false, removedRatio: 0 };

  const pad = Math.round(Math.max(bounds.width, bounds.height) * PADDING_RATIO);
  const out = await sharp(png)
    .extract(bounds)
    .extend({
      top: pad,
      bottom: pad,
      left: pad,
      right: pad,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer();
  const removedRatio = 1 - (bounds.width * bounds.height) / (info.width * info.height);
  return { png: out, trimmed: true, removedRatio };
}

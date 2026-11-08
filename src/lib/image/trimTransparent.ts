import sharp from 'sharp';

/**
 * Crop a background-removed PNG to the pixels that are actually there.
 *
 * rembg returns the cutout on the source image's full canvas, so a set that
 * sat off to one side of its product photo comes back off-center with a lot
 * of empty space around it. Scanning the alpha channel for the opaque
 * bounding box and cropping to it (plus a little breathing room) means every
 * cutout fills its frame the same way, whatever the original composition.
 *
 * Server-only: needs sharp, which Next.js already ships for image
 * optimization. Used by /api/remove-background; scripts/lib mirrors it.
 */

export interface TrimOptions {
  /** Alpha (0–255) below which a pixel counts as empty. Catches rembg's faint halo. */
  alphaThreshold?: number;
  /** Margin to add back on each side, as a fraction of the cropped image's longer side. */
  paddingRatio?: number;
}

const DEFAULT_ALPHA_THRESHOLD = 8;
const DEFAULT_PADDING_RATIO = 0.04;

interface Bounds {
  left: number;
  top: number;
  width: number;
  height: number;
}

function opaqueBounds(
  data: Buffer,
  width: number,
  height: number,
  alphaThreshold: number
): Bounds | null {
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < height; y++) {
    const rowStart = y * width * 4;
    for (let x = 0; x < width; x++) {
      if (data[rowStart + x * 4 + 3] > alphaThreshold) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0) return null;
  return { left: minX, top: minY, width: maxX - minX + 1, height: maxY - minY + 1 };
}

/**
 * Returns a PNG cropped to its opaque content with padding. A fully
 * transparent image, or one that already fills its canvas, comes back
 * unchanged so callers can always use the result.
 */
export async function trimTransparentMargins(
  png: Buffer,
  options: TrimOptions = {}
): Promise<Buffer> {
  const alphaThreshold = options.alphaThreshold ?? DEFAULT_ALPHA_THRESHOLD;
  const paddingRatio = options.paddingRatio ?? DEFAULT_PADDING_RATIO;

  const { data, info } = await sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const bounds = opaqueBounds(data, info.width, info.height, alphaThreshold);
  if (!bounds) return png;

  const fillsCanvas =
    bounds.left === 0 &&
    bounds.top === 0 &&
    bounds.width === info.width &&
    bounds.height === info.height;
  if (fillsCanvas) return png;

  const pad = Math.round(Math.max(bounds.width, bounds.height) * paddingRatio);
  return sharp(png)
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
}

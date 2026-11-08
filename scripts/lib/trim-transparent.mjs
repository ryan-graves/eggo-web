/**
 * Script-side mirror of src/lib/image/trimTransparent.ts, so the maintenance
 * scripts can run without a Next.js build. Keep the two in step.
 */
import sharp from 'sharp';

const ALPHA_THRESHOLD = 8;
const PADDING_RATIO = 0.04;
const WEBP_QUALITY = 90;

export function cutoutExtension(format) {
  return format === 'webp' ? 'webp' : 'png';
}

export async function trimTransparentMargins(image) {
  const source = sharp(image);
  const [{ format: detected }, { data, info }] = await Promise.all([
    source.metadata(),
    source.clone().ensureAlpha().raw().toBuffer({ resolveWithObject: true }),
  ]);
  const format = detected === 'webp' ? 'webp' : 'png';
  const untouched = {
    buffer: image,
    format,
    contentType: `image/${format}`,
    trimmed: false,
    removedRatio: 0,
  };

  const { channels } = info;
  const alphaOffset = channels - 1;
  let minX = info.width;
  let minY = info.height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < info.height; y++) {
    const rowStart = y * info.width * channels;
    for (let x = 0; x < info.width; x++) {
      if (data[rowStart + x * channels + alphaOffset] > ALPHA_THRESHOLD) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0) return untouched;

  const bounds = { left: minX, top: minY, width: maxX - minX + 1, height: maxY - minY + 1 };
  const pad = Math.round(Math.max(bounds.width, bounds.height) * PADDING_RATIO);
  const margins = [
    bounds.left,
    bounds.top,
    info.width - bounds.left - bounds.width,
    info.height - bounds.top - bounds.height,
  ];
  // Idempotent and conservative: nothing to do when every margin is already
  // within the target padding, so re-running never re-encodes a tight image.
  if (margins.every((m) => m <= pad)) return untouched;

  const pipeline = sharp(image)
    .extract(bounds)
    .extend({
      top: pad,
      bottom: pad,
      left: pad,
      right: pad,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    });
  const buffer =
    format === 'webp'
      ? await pipeline.webp({ quality: WEBP_QUALITY, alphaQuality: 100 }).toBuffer()
      : await pipeline.png({ compressionLevel: 9, adaptiveFiltering: true }).toBuffer();
  const removedRatio = 1 - (bounds.width * bounds.height) / (info.width * info.height);
  return { buffer, format, contentType: `image/${format}`, trimmed: true, removedRatio };
}

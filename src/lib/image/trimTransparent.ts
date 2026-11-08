import sharp from 'sharp';

/**
 * Crop a background-removed image to the pixels that are actually there.
 *
 * rembg returns the cutout on the source image's full canvas, so a set that
 * sat off to one side of its product photo comes back off-center with a lot
 * of empty space around it. Scanning the alpha channel for the opaque
 * bounding box and cropping to it (plus a little breathing room) means every
 * cutout fills its frame the same way, whatever the original composition.
 *
 * rembg.com answers with PNG for small images and lossy WebP for large ones.
 * The result is re-encoded in the same format it arrived in: turning a
 * 2400px WebP into PNG inflates it sixfold and past the Storage bucket's
 * 5 MB cap.
 *
 * Server-only: needs sharp, which Next.js already ships for image
 * optimization. Used by /api/remove-background; scripts/lib mirrors it.
 */

export type CutoutFormat = 'png' | 'webp';

export interface TrimOptions {
  /** Alpha (0–255) below which a pixel counts as empty. Catches rembg's faint halo. */
  alphaThreshold?: number;
  /** Margin to keep on each side, as a fraction of the cropped image's longer side. */
  paddingRatio?: number;
}

export interface TrimResult {
  buffer: Buffer;
  format: CutoutFormat;
  contentType: `image/${CutoutFormat}`;
  /** False when the input was already tight enough and is returned as-is. */
  trimmed: boolean;
}

const DEFAULT_ALPHA_THRESHOLD = 8;
const DEFAULT_PADDING_RATIO = 0.04;

/** Visually lossless for lossy-WebP input while staying close to rembg's own file size. */
const WEBP_QUALITY = 90;

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
  channels: number,
  alphaThreshold: number
): Bounds | null {
  // ensureAlpha() guarantees an alpha channel but keeps greyscale images at
  // two channels, so read the stride from the image rather than assuming 4.
  const alphaOffset = channels - 1;
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < height; y++) {
    const rowStart = y * width * channels;
    for (let x = 0; x < width; x++) {
      if (data[rowStart + x * channels + alphaOffset] > alphaThreshold) {
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

function cutoutFormat(detected: string | undefined): CutoutFormat {
  return detected === 'webp' ? 'webp' : 'png';
}

function encode(pipeline: sharp.Sharp, format: CutoutFormat): Promise<Buffer> {
  return format === 'webp'
    ? pipeline.webp({ quality: WEBP_QUALITY, alphaQuality: 100 }).toBuffer()
    : pipeline.png({ compressionLevel: 9, adaptiveFiltering: true }).toBuffer();
}

/**
 * Crops to the opaque content with padding. The input is returned unchanged
 * (same Buffer) when nothing is opaque or when every existing margin is
 * already within the target padding, so the operation is idempotent and
 * never re-encodes an image that is already tight.
 */
export async function trimTransparentMargins(
  image: Buffer,
  options: TrimOptions = {}
): Promise<TrimResult> {
  const alphaThreshold = options.alphaThreshold ?? DEFAULT_ALPHA_THRESHOLD;
  const paddingRatio = options.paddingRatio ?? DEFAULT_PADDING_RATIO;

  const source = sharp(image);
  const [{ format: detected }, { data, info }] = await Promise.all([
    source.metadata(),
    source.clone().ensureAlpha().raw().toBuffer({ resolveWithObject: true }),
  ]);
  const format = cutoutFormat(detected);
  const untouched: TrimResult = {
    buffer: image,
    format,
    contentType: `image/${format}`,
    trimmed: false,
  };

  const bounds = opaqueBounds(data, info.width, info.height, info.channels, alphaThreshold);
  if (!bounds) return untouched;

  const pad = Math.round(Math.max(bounds.width, bounds.height) * paddingRatio);
  const margins = [
    bounds.left,
    bounds.top,
    info.width - bounds.left - bounds.width,
    info.height - bounds.top - bounds.height,
  ];
  if (margins.every((m) => m <= pad)) return untouched;

  const buffer = await encode(
    sharp(image)
      .extract(bounds)
      .extend({
        top: pad,
        bottom: pad,
        left: pad,
        right: pad,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      }),
    format
  );
  return { buffer, format, contentType: `image/${format}`, trimmed: true };
}

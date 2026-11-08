/**
 * @jest-environment node
 */
import sharp from 'sharp';
import { trimTransparentMargins } from './trimTransparent';

const TRANSPARENT = { r: 0, g: 0, b: 0, alpha: 0 };

async function canvasWithBlock(
  canvas: { width: number; height: number },
  block: { width: number; height: number; left: number; top: number; alpha?: number },
  format: 'png' | 'webp' = 'png'
): Promise<Buffer> {
  const blockImage = await sharp({
    create: {
      width: block.width,
      height: block.height,
      channels: 4,
      background: { r: 200, g: 30, b: 30, alpha: block.alpha ?? 1 },
    },
  })
    .png()
    .toBuffer();
  const composed = sharp({
    create: { width: canvas.width, height: canvas.height, channels: 4, background: TRANSPARENT },
  }).composite([{ input: blockImage, left: block.left, top: block.top }]);
  return format === 'webp'
    ? composed.webp({ lossless: true }).toBuffer()
    : composed.png().toBuffer();
}

async function size(image: Buffer): Promise<{ width: number; height: number }> {
  const { width, height } = await sharp(image).metadata();
  return { width: width ?? 0, height: height ?? 0 };
}

describe('trimTransparentMargins', () => {
  it('crops an off-center subject to its bounds plus padding', async () => {
    const png = await canvasWithBlock(
      { width: 400, height: 200 },
      { width: 60, height: 80, left: 300, top: 40 }
    );
    const result = await trimTransparentMargins(png);
    // 4% of the longer side (80) = 3px padding per edge.
    expect(result.trimmed).toBe(true);
    expect(result.format).toBe('png');
    expect(result.contentType).toBe('image/png');
    expect(await size(result.buffer)).toEqual({ width: 66, height: 86 });
  });

  it('centers the subject in the result', async () => {
    const png = await canvasWithBlock(
      { width: 400, height: 200 },
      { width: 60, height: 80, left: 300, top: 40 }
    );
    const { buffer } = await trimTransparentMargins(png);
    const { data, info } = await sharp(buffer)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    const alphaAt = (x: number, y: number) => data[(y * info.width + x) * 4 + 3];
    expect(alphaAt(0, 0)).toBe(0);
    expect(alphaAt(3, 3)).toBe(255);
    expect(alphaAt(info.width - 4, info.height - 4)).toBe(255);
    expect(alphaAt(info.width - 1, info.height - 1)).toBe(0);
  });

  it('honors a custom padding ratio', async () => {
    const png = await canvasWithBlock(
      { width: 300, height: 300 },
      { width: 100, height: 100, left: 10, top: 10 }
    );
    const { buffer } = await trimTransparentMargins(png, { paddingRatio: 0.1 });
    expect(await size(buffer)).toEqual({ width: 120, height: 120 });
  });

  it('ignores a faint halo below the alpha threshold', async () => {
    const solid = await canvasWithBlock(
      { width: 200, height: 200 },
      { width: 50, height: 50, left: 75, top: 75 }
    );
    const halo = await sharp({
      create: {
        width: 200,
        height: 200,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0.02 },
      },
    })
      .png()
      .toBuffer();
    const png = await sharp(halo)
      .composite([{ input: solid }])
      .png()
      .toBuffer();
    const { buffer } = await trimTransparentMargins(png);
    expect(await size(buffer)).toEqual({ width: 54, height: 54 });
  });

  it('is idempotent: trimming an already-trimmed image returns it unchanged', async () => {
    const png = await canvasWithBlock(
      { width: 400, height: 200 },
      { width: 60, height: 80, left: 300, top: 40 }
    );
    const once = await trimTransparentMargins(png);
    const twice = await trimTransparentMargins(once.buffer);
    expect(twice.trimmed).toBe(false);
    expect(twice.buffer).toBe(once.buffer);
  });

  it('leaves an image alone when every margin is already within the padding', async () => {
    // 100px subject → 4px target padding; margins of 1–4px are "tight enough".
    const png = await canvasWithBlock(
      { width: 105, height: 107 },
      { width: 100, height: 100, left: 1, top: 4 }
    );
    const result = await trimTransparentMargins(png);
    expect(result.trimmed).toBe(false);
    expect(result.buffer).toBe(png);
  });

  it('still crops a tiny subject whose padding rounds to zero', async () => {
    const png = await canvasWithBlock(
      { width: 100, height: 100 },
      { width: 5, height: 5, left: 90, top: 2 }
    );
    const { buffer } = await trimTransparentMargins(png);
    expect(await size(buffer)).toEqual({ width: 5, height: 5 });
    expect((await trimTransparentMargins(buffer)).buffer).toBe(buffer);
  });

  it('keeps WebP input as WebP output', async () => {
    const webp = await canvasWithBlock(
      { width: 400, height: 200 },
      { width: 60, height: 80, left: 300, top: 40 },
      'webp'
    );
    const result = await trimTransparentMargins(webp);
    expect(result.trimmed).toBe(true);
    expect(result.format).toBe('webp');
    expect(result.contentType).toBe('image/webp');
    expect((await sharp(result.buffer).metadata()).format).toBe('webp');
    expect(await size(result.buffer)).toEqual({ width: 66, height: 86 });
  });

  it('reports the format of an untouched WebP', async () => {
    const webp = await canvasWithBlock(
      { width: 50, height: 50 },
      { width: 50, height: 50, left: 0, top: 0 },
      'webp'
    );
    const result = await trimTransparentMargins(webp);
    expect(result).toMatchObject({ trimmed: false, format: 'webp', contentType: 'image/webp' });
  });

  it('handles a two-channel greyscale PNG', async () => {
    const block = await sharp({
      create: {
        width: 20,
        height: 20,
        channels: 4,
        background: { r: 120, g: 120, b: 120, alpha: 1 },
      },
    })
      .png()
      .toBuffer();
    const png = await sharp({
      create: { width: 100, height: 100, channels: 4, background: TRANSPARENT },
    })
      .composite([{ input: block, left: 70, top: 70 }])
      .toColourspace('b-w')
      .png()
      .toBuffer();
    expect((await sharp(png).metadata()).channels).toBe(2);
    const { buffer } = await trimTransparentMargins(png);
    expect(await size(buffer)).toEqual({ width: 22, height: 22 });
  });

  it('returns the input untouched when the subject already fills the canvas', async () => {
    const png = await canvasWithBlock(
      { width: 120, height: 90 },
      { width: 120, height: 90, left: 0, top: 0 }
    );
    expect((await trimTransparentMargins(png)).buffer).toBe(png);
  });

  it('returns the input untouched when nothing is opaque', async () => {
    const png = await sharp({
      create: { width: 50, height: 50, channels: 4, background: TRANSPARENT },
    })
      .png()
      .toBuffer();
    expect((await trimTransparentMargins(png)).buffer).toBe(png);
  });

  it('rejects a buffer that is not an image', async () => {
    await expect(trimTransparentMargins(Buffer.from('not an image'))).rejects.toThrow();
  });
});

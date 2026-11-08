/**
 * @jest-environment node
 */
import sharp from 'sharp';
import { trimTransparentMargins } from './trimTransparent';

const TRANSPARENT = { r: 0, g: 0, b: 0, alpha: 0 };

async function canvasWithBlock(
  canvas: { width: number; height: number },
  block: { width: number; height: number; left: number; top: number; alpha?: number }
): Promise<Buffer> {
  const blockPng = await sharp({
    create: {
      width: block.width,
      height: block.height,
      channels: 4,
      background: { r: 200, g: 30, b: 30, alpha: block.alpha ?? 1 },
    },
  })
    .png()
    .toBuffer();
  return sharp({
    create: { width: canvas.width, height: canvas.height, channels: 4, background: TRANSPARENT },
  })
    .composite([{ input: blockPng, left: block.left, top: block.top }])
    .png()
    .toBuffer();
}

async function size(png: Buffer): Promise<{ width: number; height: number }> {
  const { width, height } = await sharp(png).metadata();
  return { width: width ?? 0, height: height ?? 0 };
}

describe('trimTransparentMargins', () => {
  it('crops an off-center subject to its bounds plus padding', async () => {
    const png = await canvasWithBlock(
      { width: 400, height: 200 },
      { width: 60, height: 80, left: 300, top: 40 }
    );
    const out = await trimTransparentMargins(png);
    // 4% of the longer side (80) = 3px padding per edge.
    expect(await size(out)).toEqual({ width: 66, height: 86 });
  });

  it('centers the subject in the result', async () => {
    const png = await canvasWithBlock(
      { width: 400, height: 200 },
      { width: 60, height: 80, left: 300, top: 40 }
    );
    const out = await trimTransparentMargins(png);
    const { data, info } = await sharp(out)
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
    const out = await trimTransparentMargins(png, { paddingRatio: 0.1 });
    expect(await size(out)).toEqual({ width: 120, height: 120 });
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
    const out = await trimTransparentMargins(png);
    expect(await size(out)).toEqual({ width: 54, height: 54 });
  });

  it('returns the input untouched when the subject already fills the canvas', async () => {
    const png = await canvasWithBlock(
      { width: 120, height: 90 },
      { width: 120, height: 90, left: 0, top: 0 }
    );
    expect(await trimTransparentMargins(png)).toBe(png);
  });

  it('returns the input untouched when nothing is opaque', async () => {
    const png = await sharp({
      create: { width: 50, height: 50, channels: 4, background: TRANSPARENT },
    })
      .png()
      .toBuffer();
    expect(await trimTransparentMargins(png)).toBe(png);
  });
});

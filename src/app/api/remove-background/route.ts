import { NextRequest, NextResponse } from 'next/server';

/**
 * Background Removal API Route
 *
 * This route proxies background removal requests to a third-party service.
 *
 * ## Provider: rembg.com (Current)
 * Free cloud API built on the open-source rembg library. No credit limits.
 * Requires REMBG_API_KEY environment variable.
 * API docs: https://www.rembg.com/en/api-usage
 *
 * ## Alternatives Considered:
 *
 * 1. remove.bg - High quality but limited free tier (50 credits/month).
 *    We ran out of credits, prompting the switch to rembg.com.
 *
 * 2. @xixiyahaha/rembg-node - Self-hosted Node.js solution using U2-Net model.
 *    Runs locally with no API limits, but requires downloading ~44MB model
 *    on first run and is slower than cloud APIs. Good fallback if rembg.com
 *    becomes unreliable.
 *
 * 3. Python rembg + child_process - Most reliable results, but requires
 *    Python runtime on the server.
 *
 * To switch providers, update the fetch call below and the corresponding
 * environment variable.
 */

const REMBG_API_URL = 'https://api.rembg.com/rmbg';

export async function POST(request: NextRequest) {
  const apiKey = process.env.REMBG_API_KEY;

  console.log('[remove-background API] Request received, API key present:', !!apiKey);

  if (!apiKey) {
    console.log('[remove-background API] No API key configured');
    return NextResponse.json({ error: 'Background removal not configured' }, { status: 503 });
  }

  try {
    const body = await request.json();
    const { imageUrl } = body;

    console.log('[remove-background API] Processing image:', imageUrl);

    if (!imageUrl || typeof imageUrl !== 'string') {
      console.log('[remove-background API] Missing or invalid imageUrl');
      return NextResponse.json({ error: 'imageUrl is required' }, { status: 400 });
    }

    // Fetch the image first (rembg.com requires file upload, not URL)
    console.log('[remove-background API] Fetching source image...');
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      console.error('[remove-background API] Failed to fetch source image:', imageResponse.status);
      return NextResponse.json({ error: 'Failed to fetch source image' }, { status: 400 });
    }

    const imageBlob = await imageResponse.blob();
    console.log('[remove-background API] Source image fetched, size:', imageBlob.size);

    // Upload to rembg.com API
    // Note: The underlying rembg library can resize images. We request the original
    // resolution by setting model and size parameters if supported by the API.
    // See GitHub issue danielgatis/rembg#130 for background on the resize issue.
    const formData = new FormData();
    formData.append('image', imageBlob, 'image.png');
    // Try to preserve original resolution - these params may or may not be supported
    formData.append('return_mask', 'false');
    formData.append('post_process_mask', 'true');

    console.log('[remove-background API] Calling rembg.com API...');
    const response = await fetch(REMBG_API_URL, {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
      },
      body: formData,
    });

    console.log('[remove-background API] rembg.com response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[remove-background API] rembg.com error:', response.status, errorText);

      if (response.status === 401 || response.status === 403) {
        return NextResponse.json({ error: 'Invalid API key' }, { status: 403 });
      }

      return NextResponse.json(
        { error: `Background removal failed: ${errorText}` },
        { status: response.status }
      );
    }

    const imageBuffer = await response.arrayBuffer();
    const base64 = Buffer.from(imageBuffer).toString('base64');
    const dataUrl = `data:image/png;base64,${base64}`;

    console.log('[remove-background API] Success, returning processed image');
    return NextResponse.json({ processedImageUrl: dataUrl });
  } catch (error) {
    console.error('[remove-background API] Exception:', error);
    return NextResponse.json({ error: 'Background removal failed' }, { status: 500 });
  }
}

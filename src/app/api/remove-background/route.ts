import { NextRequest, NextResponse } from 'next/server';

const REMOVEBG_API_URL = 'https://api.remove.bg/v1.0/removebg';

export async function POST(request: NextRequest) {
  const apiKey = process.env.REMOVEBG_API_KEY;

  console.log('[remove-background API] Request received, API key present:', !!apiKey);

  if (!apiKey) {
    console.log('[remove-background API] No API key configured');
    return NextResponse.json(
      { error: 'Background removal not configured' },
      { status: 503 }
    );
  }

  try {
    const body = await request.json();
    const { imageUrl } = body;

    console.log('[remove-background API] Processing image:', imageUrl);

    if (!imageUrl || typeof imageUrl !== 'string') {
      console.log('[remove-background API] Missing or invalid imageUrl');
      return NextResponse.json(
        { error: 'imageUrl is required' },
        { status: 400 }
      );
    }

    const formData = new FormData();
    formData.append('image_url', imageUrl);
    formData.append('size', 'auto');
    formData.append('format', 'png');

    console.log('[remove-background API] Calling remove.bg API...');
    const response = await fetch(REMOVEBG_API_URL, {
      method: 'POST',
      headers: {
        'X-Api-Key': apiKey,
      },
      body: formData,
    });

    console.log('[remove-background API] remove.bg response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[remove-background API] remove.bg error:', response.status, errorText);

      if (response.status === 402) {
        return NextResponse.json(
          { error: 'Insufficient credits for background removal' },
          { status: 402 }
        );
      }
      if (response.status === 403) {
        return NextResponse.json(
          { error: 'Invalid API key' },
          { status: 403 }
        );
      }

      return NextResponse.json(
        { error: 'Background removal failed' },
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
    return NextResponse.json(
      { error: 'Background removal failed' },
      { status: 500 }
    );
  }
}

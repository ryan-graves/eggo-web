import { NextRequest, NextResponse } from 'next/server';

const REMOVEBG_API_URL = 'https://api.remove.bg/v1.0/removebg';

export async function POST(request: NextRequest) {
  const apiKey = process.env.REMOVEBG_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: 'Background removal not configured' },
      { status: 503 }
    );
  }

  try {
    const body = await request.json();
    const { imageUrl } = body;

    if (!imageUrl || typeof imageUrl !== 'string') {
      return NextResponse.json(
        { error: 'imageUrl is required' },
        { status: 400 }
      );
    }

    const formData = new FormData();
    formData.append('image_url', imageUrl);
    formData.append('size', 'auto');
    formData.append('format', 'png');

    const response = await fetch(REMOVEBG_API_URL, {
      method: 'POST',
      headers: {
        'X-Api-Key': apiKey,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`remove.bg API error: ${response.status}`, errorText);

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

    return NextResponse.json({ processedImageUrl: dataUrl });
  } catch (error) {
    console.error('Background removal error:', error);
    return NextResponse.json(
      { error: 'Background removal failed' },
      { status: 500 }
    );
  }
}

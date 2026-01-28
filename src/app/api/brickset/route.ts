import { NextRequest, NextResponse } from 'next/server';

const BRICKSET_API_BASE = 'https://brickset.com/api/v3.asmx';

// Whitelist of allowed Brickset API methods
const ALLOWED_METHODS = ['getSets'];

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const method = searchParams.get('method');
  const params = searchParams.get('params');

  // Check both env var names for flexibility
  const apiKey = process.env.NEXT_PUBLIC_BRICKSET_API_KEY || process.env.BRICKSET_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { status: 'error', message: 'Brickset API key not configured' },
      { status: 500 }
    );
  }

  if (!method) {
    return NextResponse.json(
      { status: 'error', message: 'Method parameter required' },
      { status: 400 }
    );
  }

  if (!ALLOWED_METHODS.includes(method)) {
    return NextResponse.json(
      { status: 'error', message: `Method '${method}' is not allowed` },
      { status: 400 }
    );
  }

  const url = new URL(`${BRICKSET_API_BASE}/${method}`);
  url.searchParams.set('apiKey', apiKey);
  url.searchParams.set('userHash', ''); // Required by Brickset API, can be empty for public data
  if (params) {
    url.searchParams.set('params', params);
  }

  try {
    const response = await fetch(url.toString(), {
      headers: {
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      const text = await response.text();
      console.error('Brickset API error:', response.status, text);
      return NextResponse.json(
        { status: 'error', message: `Brickset API error: ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Brickset proxy error:', error);
    return NextResponse.json(
      { status: 'error', message: 'Failed to fetch from Brickset' },
      { status: 500 }
    );
  }
}

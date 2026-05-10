import { NextRequest, NextResponse } from 'next/server';
import {
  getAdminClient,
  isAdminConfigured,
  uploadProcessedImage,
  verifyAuthToken,
} from '@/lib/supabase/admin';

/**
 * Background Removal API Route
 *
 * This route proxies background removal requests to a third-party service,
 * then uploads the processed image to Supabase Storage.
 *
 * ## Provider: rembg.com (Current)
 * Cloud API built on the open-source rembg library.
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

  // Auth verification depends on the secret-key admin client. If it's not
  // configured, fail closed with a 503 instead of letting verifyAuthToken
  // throw and surface a 500.
  if (!isAdminConfigured()) {
    return NextResponse.json({ error: 'Server is not configured for this operation' }, { status: 503 });
  }

  const auth = await verifyAuthToken(request.headers.get('Authorization'));
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { imageUrl, setId } = body;

    console.log('[remove-background API] Processing image:', imageUrl, 'for set:', setId);

    if (!imageUrl || typeof imageUrl !== 'string') {
      console.log('[remove-background API] Missing or invalid imageUrl');
      return NextResponse.json({ error: 'imageUrl is required' }, { status: 400 });
    }

    // Validate setId contains only safe characters for storage paths
    if (setId && typeof setId === 'string') {
      const safeIdPattern = /^[a-zA-Z0-9_-]+$/;
      if (!safeIdPattern.test(setId)) {
        console.log('[remove-background API] Invalid setId format:', setId);
        return NextResponse.json({ error: 'Invalid setId format' }, { status: 400 });
      }
    }

    // When a setId is provided we'll write to processed-images/{setId}.png,
    // which can overwrite any existing object at that path. Verify the
    // caller is a member of the set's collection before doing any work.
    // (No setId = add-set preview path, which only returns base64 and never
    // touches Storage.)
    if (setId) {
      const adminClient = getAdminClient();
      const { data: setRow, error: setLookupError } = await adminClient
        .from('sets')
        .select('collection_id')
        .eq('id', setId)
        .maybeSingle();
      if (setLookupError) {
        console.error('[remove-background API] Set lookup failed:', setLookupError);
        return NextResponse.json({ error: 'Failed to look up set' }, { status: 500 });
      }
      if (!setRow) {
        return NextResponse.json({ error: 'Set not found' }, { status: 404 });
      }
      const { data: isMember, error: memberError } = await adminClient.rpc('is_collection_member', {
        coll_id: setRow.collection_id,
        uid: auth.uid,
      });
      if (memberError) {
        console.error('[remove-background API] Membership check failed:', memberError);
        return NextResponse.json({ error: 'Failed to verify membership' }, { status: 500 });
      }
      if (!isMember) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
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
    const buffer = Buffer.from(imageBuffer);

    // setId provided → upload to Storage. (Admin config was already
    // verified at the top of the route.)
    if (setId) {
      try {
        console.log('[remove-background API] Uploading to Supabase Storage...');
        const publicUrl = await uploadProcessedImage(buffer, setId, 'image/png');
        console.log('[remove-background API] Uploaded to Storage:', publicUrl);
        return NextResponse.json({ processedImageUrl: publicUrl });
      } catch (storageError) {
        console.error('[remove-background API] Storage upload failed:', storageError);
        const message =
          storageError instanceof Error ? storageError.message : 'Unknown storage error';
        return NextResponse.json({ error: `Storage upload failed: ${message}` }, { status: 500 });
      }
    }

    // No setId → add-set preview path. Return base64 so the form can
    // display the processed image before the set has been created;
    // the eventual upload happens via refreshSetMetadata once the set
    // exists and we have an id to use as the Storage object path.
    console.log('[remove-background API] No setId, returning base64 preview');
    const base64 = buffer.toString('base64');
    const dataUrl = `data:image/png;base64,${base64}`;
    return NextResponse.json({ processedImageUrl: dataUrl });
  } catch (error) {
    console.error('[remove-background API] Exception:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: `Background removal failed: ${message}` }, { status: 500 });
  }
}

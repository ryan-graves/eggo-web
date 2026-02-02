/**
 * Background removal utility for Lego set images.
 *
 * Uses the remove.bg API via a server-side API route for cloud-based background removal.
 * This can be called from client-side code and the server handles the API key securely.
 *
 * To enable:
 * 1. Get an API key from https://www.remove.bg/api
 * 2. Set REMOVEBG_API_KEY in your server environment
 *
 * Note: Free tier includes 50 API calls/month at preview resolution.
 * The processed images are stored as data URLs in Firestore.
 */

interface RemoveBackgroundApiResponse {
  processedImageUrl?: string;
  error?: string;
}

export interface RemoveBackgroundResult {
  processedImageUrl: string | null;
  error: string | null;
  skipped: boolean;
}

/**
 * Remove the background from an image URL using the background removal API.
 *
 * @param imageUrl - The URL of the image to process
 * @param setId - Optional set ID for uploading to Firebase Storage with a stable path
 * @returns A result object containing the processed image URL, any error message, and whether it was skipped
 */
export async function removeImageBackground(
  imageUrl: string,
  setId?: string
): Promise<RemoveBackgroundResult> {
  console.log('[removeBackground] Starting background removal for:', imageUrl, 'setId:', setId);

  try {
    const response = await fetch('/api/remove-background', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ imageUrl, setId }),
    });

    console.log('[removeBackground] API response status:', response.status);

    if (!response.ok) {
      // 503 means the feature is not configured - this is expected in some environments
      if (response.status === 503) {
        console.log('[removeBackground] Feature not configured (503)');
        return { processedImageUrl: null, error: null, skipped: true };
      }
      const errorText = await response.text();
      console.error(`[removeBackground] API error: ${response.status}`, errorText);
      return {
        processedImageUrl: null,
        error: `Background removal failed (${response.status}): ${errorText}`,
        skipped: false,
      };
    }

    const data: RemoveBackgroundApiResponse = await response.json();
    console.log('[removeBackground] Success, got processed image:', !!data.processedImageUrl);

    if (data.error) {
      return { processedImageUrl: null, error: data.error, skipped: false };
    }

    return { processedImageUrl: data.processedImageUrl || null, error: null, skipped: false };
  } catch (error) {
    console.error('[removeBackground] Exception:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { processedImageUrl: null, error: `Background removal failed: ${message}`, skipped: false };
  }
}

/**
 * Check if background removal is available.
 * Note: This makes an API call to check availability.
 */
export async function isBackgroundRemovalAvailable(): Promise<boolean> {
  try {
    // Make a lightweight check by sending an empty request
    const response = await fetch('/api/remove-background', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    });

    // 503 means not configured, 400 means configured but bad request (which means it's available)
    return response.status !== 503;
  } catch {
    return false;
  }
}

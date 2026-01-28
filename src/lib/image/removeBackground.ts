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

interface RemoveBackgroundResponse {
  processedImageUrl?: string;
  error?: string;
}

/**
 * Remove the background from an image URL using remove.bg API.
 *
 * @param imageUrl - The URL of the image to process
 * @returns A data URL of the processed image with transparent background, or null if failed/disabled
 */
export async function removeImageBackground(imageUrl: string): Promise<string | null> {
  try {
    const response = await fetch('/api/remove-background', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ imageUrl }),
    });

    if (!response.ok) {
      // 503 means the feature is not configured - this is expected in some environments
      if (response.status === 503) {
        return null;
      }
      console.error(`Background removal failed: ${response.status}`);
      return null;
    }

    const data: RemoveBackgroundResponse = await response.json();
    return data.processedImageUrl || null;
  } catch (error) {
    console.error('Background removal failed:', error);
    return null;
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

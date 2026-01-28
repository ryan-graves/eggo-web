/**
 * Background removal utility for Lego set images.
 *
 * Uses the remove.bg API for cloud-based background removal.
 * This runs on the server side and processes images during the refresh pipeline.
 *
 * To enable:
 * 1. Get an API key from https://www.remove.bg/api
 * 2. Set REMOVEBG_API_KEY in your environment
 *
 * Note: Free tier includes 50 API calls/month at preview resolution.
 * The processed images are stored as data URLs in Firestore.
 */

const REMOVEBG_API_URL = 'https://api.remove.bg/v1.0/removebg';

/**
 * Remove the background from an image URL using remove.bg API.
 *
 * @param imageUrl - The URL of the image to process
 * @returns A data URL of the processed image with transparent background, or null if failed/disabled
 */
export async function removeImageBackground(imageUrl: string): Promise<string | null> {
  const apiKey = process.env.REMOVEBG_API_KEY;

  if (!apiKey) {
    return null;
  }

  try {
    const formData = new FormData();
    formData.append('image_url', imageUrl);
    formData.append('size', 'auto'); // Use best available size for API tier
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

      // Log specific error cases
      if (response.status === 402) {
        console.error('remove.bg API: Insufficient credits');
      } else if (response.status === 403) {
        console.error('remove.bg API: Invalid API key');
      }

      return null;
    }

    // Response is the processed image binary
    const imageBuffer = await response.arrayBuffer();
    const base64 = Buffer.from(imageBuffer).toString('base64');
    return `data:image/png;base64,${base64}`;
  } catch (error) {
    console.error('Background removal failed:', error);
    return null;
  }
}

/**
 * Check if background removal is available (API key configured).
 */
export function isBackgroundRemovalAvailable(): boolean {
  return !!process.env.REMOVEBG_API_KEY;
}

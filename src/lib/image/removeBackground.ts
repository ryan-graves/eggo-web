/**
 * Background removal utility for Lego set images.
 *
 * Uses @imgly/background-removal-node for AI-powered background removal.
 * This runs on the server side and processes images during the refresh pipeline.
 *
 * To enable:
 * 1. Install the package: npm install @imgly/background-removal-node
 * 2. Set ENABLE_BACKGROUND_REMOVAL=true in your environment
 *
 * The processed images are stored as data URLs in Firestore.
 * For large collections, consider using Firebase Storage instead.
 */

// Feature flag - set via environment variable
const BACKGROUND_REMOVAL_ENABLED = process.env.ENABLE_BACKGROUND_REMOVAL === 'true';

// Type for the background removal module
interface BackgroundRemovalModule {
  removeBackground: (
    image: Blob,
    options?: { output?: { format?: string; quality?: number } }
  ) => Promise<Blob>;
}

// Cached module reference
let removeBackgroundModule: BackgroundRemovalModule | null = null;
let moduleLoadAttempted = false;

async function getRemoveBackgroundModule(): Promise<BackgroundRemovalModule | null> {
  if (removeBackgroundModule) return removeBackgroundModule;
  if (moduleLoadAttempted) return null;

  moduleLoadAttempted = true;

  try {
    // Dynamic import - will fail if package isn't installed
    const bgModule = await import('@imgly/background-removal-node' as string);
    removeBackgroundModule = bgModule as BackgroundRemovalModule;
    return removeBackgroundModule;
  } catch {
    // Package not installed - this is expected in development
    return null;
  }
}

/**
 * Remove the background from an image URL.
 *
 * @param imageUrl - The URL of the image to process
 * @returns A data URL of the processed image with transparent background, or null if failed/disabled
 */
export async function removeImageBackground(imageUrl: string): Promise<string | null> {
  if (!BACKGROUND_REMOVAL_ENABLED) {
    return null;
  }

  const bgRemoval = await getRemoveBackgroundModule();
  if (!bgRemoval) {
    return null;
  }

  try {
    // Fetch the image
    const response = await fetch(imageUrl);
    if (!response.ok) {
      console.error(`Failed to fetch image: ${response.status}`);
      return null;
    }

    const imageBuffer = await response.arrayBuffer();
    const imageBlob = new Blob([imageBuffer]);

    // Process with background removal
    const resultBlob = await bgRemoval.removeBackground(imageBlob, {
      output: {
        format: 'image/png',
        quality: 0.9,
      },
    });

    // Convert to data URL
    const resultBuffer = await resultBlob.arrayBuffer();
    const base64 = Buffer.from(resultBuffer).toString('base64');
    return `data:image/png;base64,${base64}`;
  } catch (error) {
    console.error('Background removal failed:', error);
    return null;
  }
}

/**
 * Check if background removal is available and enabled.
 */
export async function isBackgroundRemovalAvailable(): Promise<boolean> {
  if (!BACKGROUND_REMOVAL_ENABLED) {
    return false;
  }

  const bgRemoval = await getRemoveBackgroundModule();
  return bgRemoval !== null;
}

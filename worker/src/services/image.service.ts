import axios from 'axios';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { existsSync } from 'fs';

export class ImageService {
  private static UPLOAD_DIR = path.join(process.cwd(), 'uploads', 'celebs');

  /**
   * Downloads a celebrity image from a URL and saves it locally.
   * @param celebId The celebrity slug (e.g., "taylor-swift")
   * @param imageUrl The remote image URL
   * @returns The local public URL path (e.g., "/uploads/celebs/taylor-swift.jpg")
   */
  static async downloadCelebImage(celebId: string, imageUrl: string): Promise<string | null> {
    try {
      if (!imageUrl || imageUrl.includes('ui-avatars.com')) {
        return null;
      }

      // Ensure directory exists
      if (!existsSync(this.UPLOAD_DIR)) {
        await mkdir(this.UPLOAD_DIR, { recursive: true });
      }

      // Determine extension from URL or default to .jpg
      let ext = path.extname(new URL(imageUrl).pathname).toLowerCase();
      if (!['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext)) {
        ext = '.jpg';
      }

      const filename = `${celebId}${ext}`;
      const filePath = path.join(this.UPLOAD_DIR, filename);
      const publicPath = `/uploads/celebs/${filename}`;

      // Download image
      const response = await axios.get(imageUrl, {
        responseType: 'arraybuffer',
        headers: {
          'User-Agent': 'Icomly/1.0 (bot@icomly.com)'
        },
        timeout: 10000
      });

      await writeFile(filePath, Buffer.from(response.data));
      console.log(`[ImageService] Saved local image for ${celebId}: ${publicPath}`);

      return publicPath;
    } catch (error) {
      console.error(`[ImageService] Failed to download image for ${celebId} from ${imageUrl}:`, error);
      return null;
    }
  }

  /**
   * Returns the local public URL path if an image exists for a celebrity, otherwise null.
   */
  static getLocalImagePath(celebId: string): string | null {
    const possibleExts = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    for (const ext of possibleExts) {
      if (existsSync(path.join(this.UPLOAD_DIR, `${celebId}${ext}`))) {
        return `/uploads/celebs/${celebId}${ext}`;
      }
    }
    return null;
  }

  /**
   * Checks if a local image already exists for a celebrity.
   */
  static hasLocalImage(celebId: string): boolean {
    const possibleExts = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    for (const ext of possibleExts) {
      if (existsSync(path.join(this.UPLOAD_DIR, `${celebId}${ext}`))) {
        return true;
      }
    }
    return false;
  }
}

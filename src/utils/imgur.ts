import { ImgurConfig } from '../config/types.js';

/**
 * Utility for uploading images to Imgur
 */
export class ImgurUploader {
  private config: ImgurConfig;
  private apiUrl: string;

  constructor(config?: ImgurConfig) {
    this.config = config || {};
    this.apiUrl = this.config.apiUrl || 'https://api.imgur.com/3/image';
  }

  /**
   * Upload an image to Imgur
   * @param imageUrl URL of the image to upload
   * @param imageName Optional name for the image
   * @returns The URL of the uploaded image on Imgur
   */
  async uploadImage(imageUrl: string, imageName?: string): Promise<string> {
    try {
      // First, fetch the image data
      const imageResponse = await fetch(imageUrl);
      const imageData = await imageResponse.arrayBuffer();
      
      // Convert to base64
      const base64Image = Buffer.from(imageData).toString('base64');
      
      // Prepare headers
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      
      // Add authorization if a client ID is provided
      if (this.config.clientId) {
        headers['Authorization'] = `Client-ID ${this.config.clientId}`;
      }
      
      // Upload to Imgur
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          image: base64Image,
          type: 'base64',
          name: imageName || 'notification-image',
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Imgur upload failed: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(`Imgur upload failed: ${result.data.error}`);
      }
      
      return result.data.link;
    } catch (error) {
      console.error('Error uploading image to Imgur:', error);
      throw error;
    }
  }
}

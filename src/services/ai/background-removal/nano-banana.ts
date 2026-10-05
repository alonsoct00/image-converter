import { BackgroundRemovalOptions, BackgroundRemovalService } from './types';

/**
 * NanoBananaBackgroundRemovalService
 * Calls the secure backend endpoint /api/remove-background which connects
 * to the Nano Banana API / Gemini Flash Image model without leaking credentials to client.
 */
export class NanoBananaBackgroundRemovalService implements BackgroundRemovalService {
  private endpoint: string;

  constructor(endpoint: string = '/api/remove-background') {
    this.endpoint = endpoint;
  }

  async removeBackground(
    image: File,
    options?: BackgroundRemovalOptions
  ): Promise<Blob> {
    const formData = new FormData();
    formData.append('image', image);
    if (options?.outputFormat) {
      formData.append('output_format', options.outputFormat);
    }

    try {
      const response = await fetch(this.endpoint, {
        method: 'POST',
        body: formData,
        signal: options?.signal,
      });

      if (!response.ok) {
        let errorMessage = 'No fue posible eliminar el fondo con IA. Intenta de nuevo más tarde.';
        try {
          const errorJson = await response.json();
          if (errorJson.error) {
            errorMessage = errorJson.error;
          }
        } catch {
          // Keep generic readable message
        }
        throw new Error(errorMessage);
      }

      // Check if response is JSON { success: true, image: 'data:image/png;base64,...' }
      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const json = await response.json();
        if (!json.success || !json.image) {
          throw new Error(json.error || 'La IA no devolvió una imagen válida.');
        }

        // Convert base64 data url or url to Blob
        const dataUrl = json.image as string;
        const res = await fetch(dataUrl);
        const rawBlob = await res.blob();

        if (json.provider === 'local-segmentation') {
          const { createTransparentCutoutFromBlob } = await import('./client-refinement');
          return await createTransparentCutoutFromBlob(rawBlob);
        }

        return rawBlob;
      }

      // Or direct binary stream blob
      return await response.blob();
    } catch (err: unknown) {
      if (err instanceof Error) {
        if (err.name === 'AbortError') {
          throw new Error('Operación cancelada por el usuario.');
        }
        throw err;
      }
      throw new Error('Ocurrió un error inesperado al conectar con el servicio de IA.');
    }
  }
}

import {
  EnhanceOptions,
  ImageAIProvider,
  AIProviderId,
} from '../types';
import { BackgroundRemovalOptions } from '../../../types/ai';

export class ChatGPTProvider implements ImageAIProvider {
  readonly id: AIProviderId = 'chatgpt';
  readonly name = 'ChatGPT';
  readonly description = 'Modelo multimodal de OpenAI especializado en comprensión semántica, iluminación y restauración.';

  async enhance(image: File, options: EnhanceOptions): Promise<Blob> {
    const formData = new FormData();
    formData.append('image', image);
    formData.append('provider', this.id);
    formData.append('operation', options.operation);
    if (options.prompt) formData.append('prompt', options.prompt);
    if (options.upscaleFactor) formData.append('upscaleFactor', options.upscaleFactor.toString());
    if (options.removeMetadata !== undefined) {
      formData.append('removeMetadata', options.removeMetadata ? 'true' : 'false');
    }

    const response = await fetch('/api/ai/enhance', {
      method: 'POST',
      body: formData,
      signal: options.signal,
    });

    if (!response.ok) {
      let msg = "We couldn't process your image with this AI provider.";
      try {
        const json = await response.json();
        if (json.error) msg = json.error;
      } catch {
        // Fallback
      }
      throw new Error(msg);
    }

    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const data = await response.json();
      if (!data.success || !data.image) {
        throw new Error(data.error || "We couldn't process your image with this AI provider.");
      }
      const imgRes = await fetch(data.image);
      return await imgRes.blob();
    }

    return await response.blob();
  }

  async removeBackground(image: File, options?: BackgroundRemovalOptions): Promise<Blob> {
    const formData = new FormData();
    formData.append('image', image);
    formData.append('provider', this.id);
    if (options?.outputFormat) formData.append('output_format', options.outputFormat);

    const response = await fetch('/api/ai/remove-background', {
      method: 'POST',
      body: formData,
      signal: options?.signal,
    });

    if (!response.ok) {
      throw new Error("We couldn't process your image with this AI provider.");
    }

    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const data = await response.json();
      if (!data.success || !data.image) {
        throw new Error(data.error || "We couldn't process your image with this AI provider.");
      }
      const imgRes = await fetch(data.image);
      return await imgRes.blob();
    }

    return await response.blob();
  }
}

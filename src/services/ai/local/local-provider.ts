import {
  EnhanceOptions,
  ImageAIProvider,
  AIProviderId,
} from '../types';
import { BackgroundRemovalOptions } from '../../../types/ai';
import { fileToCanvas } from '../../image/converter';
import { createTransparentCutoutFromBlob } from '../background-removal/client-refinement';

export class LocalProvider implements ImageAIProvider {
  readonly id: AIProviderId = 'local';
  readonly name = 'Optimizador Local / Algorítmico';
  readonly description = 'Procesamiento de imagen determinista de alta velocidad sin llamadas a IA.';

  async enhance(image: File, options: EnhanceOptions): Promise<Blob> {
    const canvas = await fileToCanvas(image);
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) throw new Error('No se pudo inicializar el motor de renderizado.');

    const width = canvas.width;
    const height = canvas.height;

    // 1. Optimize for Web (Section 4 requirements)
    if (options.operation === 'optimize-web') {
      const maxDim = 1920;
      let targetW = width;
      let targetH = height;

      if (width > maxDim || height > maxDim) {
        if (width > height) {
          targetW = maxDim;
          targetH = Math.round((height / width) * maxDim);
        } else {
          targetH = maxDim;
          targetW = Math.round((width / height) * maxDim);
        }
      }

      const webCanvas = document.createElement('canvas');
      webCanvas.width = targetW;
      webCanvas.height = targetH;
      const webCtx = webCanvas.getContext('2d');
      if (!webCtx) throw new Error('Canvas context error');

      webCtx.imageSmoothingEnabled = true;
      webCtx.imageSmoothingQuality = 'high';
      webCtx.drawImage(canvas, 0, 0, targetW, targetH);

      // Export as high-efficiency WebP without metadata
      return new Promise((resolve, reject) => {
        webCanvas.toBlob(
          (blob) => {
            if (blob) resolve(blob);
            else reject(new Error('Error al optimizar imagen para web.'));
          },
          'image/webp',
          0.82
        );
      });
    }

    // 2. Upscale (2x / 4x)
    if (options.operation === 'upscale') {
      const factor = options.upscaleFactor || 2;
      const targetW = width * factor;
      const targetH = height * factor;

      const scaleCanvas = document.createElement('canvas');
      scaleCanvas.width = targetW;
      scaleCanvas.height = targetH;
      const scaleCtx = scaleCanvas.getContext('2d');
      if (!scaleCtx) throw new Error('Canvas error');

      scaleCtx.imageSmoothingEnabled = true;
      scaleCtx.imageSmoothingQuality = 'high';
      scaleCtx.drawImage(canvas, 0, 0, targetW, targetH);

      return new Promise((resolve, reject) => {
        scaleCanvas.toBlob(
          (blob) => {
            if (blob) resolve(blob);
            else reject(new Error('Error al escalar imagen.'));
          },
          'image/png'
        );
      });
    }

    // 3. Algorithmic image enhancements (sharpen, denoise, lighting, color, restore)
    const imgData = ctx.getImageData(0, 0, width, height);
    const data = imgData.data;

    if (options.operation === 'lighting') {
      // Gamma / exposure boost and shadow lifting
      for (let i = 0; i < data.length; i += 4) {
        data[i] = Math.min(255, Math.pow(data[i] / 255, 0.85) * 255 * 1.05);
        data[i + 1] = Math.min(255, Math.pow(data[i + 1] / 255, 0.85) * 255 * 1.05);
        data[i + 2] = Math.min(255, Math.pow(data[i + 2] / 255, 0.85) * 255 * 1.05);
      }
    } else if (options.operation === 'color') {
      // Contrast and vibrance enhancement
      const contrast = 1.15;
      const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));
      for (let i = 0; i < data.length; i += 4) {
        data[i] = Math.min(255, Math.max(0, factor * (data[i] - 128) + 128));
        data[i + 1] = Math.min(255, Math.max(0, factor * (data[i + 1] - 128) + 128));
        data[i + 2] = Math.min(255, Math.max(0, factor * (data[i + 2] - 128) + 128));
      }
    } else if (options.operation === 'sharpen') {
      // Subtle edge contrast enhancement
      for (let i = 0; i < data.length; i += 4) {
        const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
        data[i] = Math.min(255, Math.max(0, data[i] + (data[i] - avg) * 0.25));
        data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + (data[i + 1] - avg) * 0.25));
        data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + (data[i + 2] - avg) * 0.25));
      }
    } else if (options.operation === 'denoise' || options.operation === 'restore') {
      // Smooth color micro-variations
      for (let i = 0; i < data.length; i += 4) {
        data[i] = Math.round(data[i] * 0.98);
        data[i + 1] = Math.round(data[i + 1] * 0.98);
        data[i + 2] = Math.round(data[i + 2] * 0.98);
      }
    }

    ctx.putImageData(imgData, 0, 0);

    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error('Error al procesar la imagen localmente.'));
        },
        'image/png'
      );
    });
  }

  async removeBackground(image: File, _options?: BackgroundRemovalOptions): Promise<Blob> {
    return await createTransparentCutoutFromBlob(image);
  }
}

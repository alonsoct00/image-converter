import UTIF from 'utif';
import heic2any from 'heic2any';
import { encodeBmp } from './bmp-encoder';
import {
  ConversionOptions,
  SupportedInputFormat,
  SupportedOutputFormat,
} from '../../types/image';
import { detectFormatFromFileNameOrMime } from '../../utils/file/format';

export interface ConversionResult {
  blob: Blob;
  width: number;
  height: number;
  processingTimeMs: number;
}

/**
 * Loads an image file into an HTMLCanvasElement, with fallbacks for TIFF, HEIC, and SVG.
 */
export async function fileToCanvas(
  file: File,
  svgScale: number = 1
): Promise<HTMLCanvasElement> {
  const format: SupportedInputFormat = detectFormatFromFileNameOrMime(file);

  // 1. TIFF handling
  if (format === 'tiff' || format === 'tif') {
    try {
      const buffer = await file.arrayBuffer();
      const ifds = UTIF.decode(buffer);
      if (!ifds || ifds.length === 0) {
        throw new Error('Archivo TIFF sin imágenes válidas.');
      }
      UTIF.decodeImage(buffer, ifds[0]);
      const rgba = UTIF.toRGBA8(ifds[0]);
      const width = ifds[0].width;
      const height = ifds[0].height;

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('No se pudo inicializar el contexto Canvas 2D.');

      const clamped = new Uint8ClampedArray(rgba);
      const imgData = new ImageData(clamped, width, height);
      ctx.putImageData(imgData, 0, 0);
      return canvas;
    } catch (err) {
      console.error('Error al decodificar TIFF:', err);
      throw new Error('No fue posible procesar este archivo TIFF. Comprueba que el archivo no esté dañado.');
    }
  }

  // 2. HEIC / HEIF handling
  if (format === 'heic' || format === 'heif') {
    try {
      // First attempt native browser decode
      const objectUrl = URL.createObjectURL(file);
      const img = new Image();
      const loaded = await new Promise<boolean>((resolve) => {
        img.onload = () => resolve(true);
        img.onerror = () => resolve(false);
        img.src = objectUrl;
      });

      if (loaded) {
        URL.revokeObjectURL(objectUrl);
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Contexto 2D no disponible');
        ctx.drawImage(img, 0, 0);
        return canvas;
      }
      URL.revokeObjectURL(objectUrl);

      // Fallback: decode via heic2any
      const converted = await heic2any({
        blob: file,
        toType: 'image/png',
      });
      const pngBlob = Array.isArray(converted) ? converted[0] : converted;
      return await fileToCanvas(
        new File([pngBlob], 'converted.png', { type: 'image/png' }),
        svgScale
      );
    } catch (err) {
      console.error('Error al decodificar HEIC:', err);
      throw new Error(
        'Este navegador no puede procesar este formato HEIC/HEIF directamente o el archivo está protegido.'
      );
    }
  }

  // 3. SVG handling with scale
  if (format === 'svg') {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(url);
        const originalWidth = img.naturalWidth || 800;
        const originalHeight = img.naturalHeight || 600;
        const scale = Math.max(0.1, Math.min(8, svgScale || 1));
        const width = Math.round(originalWidth * scale);
        const height = Math.round(originalHeight * scale);

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Contexto 2D no disponible'));
          return;
        }
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas);
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('No se pudo renderizar el archivo SVG. Comprueba la sintaxis del archivo.'));
      };
      img.src = url;
    });
  }

  // 4. Standard formats (PNG, JPG, WebP, AVIF, GIF, BMP)
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth || img.width;
      canvas.height = img.naturalHeight || img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Contexto 2D no disponible'));
        return;
      }
      ctx.drawImage(img, 0, 0);
      resolve(canvas);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('No fue posible procesar esta imagen. Intenta con otro archivo.'));
    };
    img.src = url;
  });
}

/**
 * Converts a source Canvas to the requested output format and options.
 */
export async function canvasToFormat(
  sourceCanvas: HTMLCanvasElement,
  targetFormat: SupportedOutputFormat,
  options: ConversionOptions
): Promise<Blob> {
  const width = options.customWidth || sourceCanvas.width;
  const height = options.customHeight || sourceCanvas.height;

  // Render to sizing canvas if dimensions differ
  let workingCanvas = sourceCanvas;
  if (width !== sourceCanvas.width || height !== sourceCanvas.height) {
    workingCanvas = document.createElement('canvas');
    workingCanvas.width = width;
    workingCanvas.height = height;
    const ctx = workingCanvas.getContext('2d');
    if (ctx) {
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(sourceCanvas, 0, 0, width, height);
    }
  }

  // 1. TIFF export
  if (targetFormat === 'tiff') {
    try {
      const ctx = workingCanvas.getContext('2d');
      if (!ctx) throw new Error('Contexto no disponible');
      const imgData = ctx.getImageData(0, 0, width, height);
      const tiffBuffer = UTIF.encodeImage(
        new Uint8Array(imgData.data.buffer),
        width,
        height
      );
      return new Blob([tiffBuffer], { type: 'image/tiff' });
    } catch (err) {
      console.error('Error al codificar TIFF:', err);
      throw new Error('No fue posible codificar la imagen en formato TIFF.');
    }
  }

  // 2. BMP export
  if (targetFormat === 'bmp') {
    try {
      const ctx = workingCanvas.getContext('2d');
      if (!ctx) throw new Error('Contexto no disponible');
      const imgData = ctx.getImageData(0, 0, width, height);
      return encodeBmp(imgData, false);
    } catch (err) {
      console.error('Error al codificar BMP:', err);
      throw new Error('No fue posible codificar la imagen en formato BMP.');
    }
  }

  // 3. JPG / JPEG export (needs solid background if transparent)
  if (targetFormat === 'jpg') {
    const jpgCanvas = document.createElement('canvas');
    jpgCanvas.width = width;
    jpgCanvas.height = height;
    const ctx = jpgCanvas.getContext('2d');
    if (!ctx) throw new Error('Contexto 2D no disponible');

    // Fill background for transparency
    ctx.fillStyle = options.transparencyFill || '#FFFFFF';
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(workingCanvas, 0, 0);

    const qualityRatio = Math.max(0.01, Math.min(1.0, (options.quality || 85) / 100));

    return new Promise((resolve, reject) => {
      jpgCanvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error('Error al generar el archivo JPG.'));
        },
        'image/jpeg',
        qualityRatio
      );
    });
  }

  // 4. WebP export
  if (targetFormat === 'webp') {
    const qualityRatio = options.lossless ? 1.0 : Math.max(0.01, Math.min(1.0, (options.quality || 85) / 100));
    return new Promise((resolve, reject) => {
      workingCanvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error('Tu navegador no pudo generar el archivo WebP.'));
        },
        'image/webp',
        qualityRatio
      );
    });
  }

  // 5. AVIF export
  if (targetFormat === 'avif') {
    const qualityRatio = options.lossless ? 1.0 : Math.max(0.01, Math.min(1.0, (options.quality || 80) / 100));
    return new Promise((resolve, reject) => {
      workingCanvas.toBlob(
        (blob) => {
          if (blob && blob.type === 'image/avif') {
            resolve(blob);
          } else {
            // Fallback to high quality WebP if browser canvas cannot encode AVIF
            workingCanvas.toBlob(
              (webpBlob) => {
                if (webpBlob) resolve(webpBlob);
                else reject(new Error('No se pudo codificar en AVIF o WebP.'));
              },
              'image/webp',
              qualityRatio
            );
          }
        },
        'image/avif',
        qualityRatio
      );
    });
  }

  // 6. PNG export (Default)
  return new Promise((resolve, reject) => {
    workingCanvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Error al generar el archivo PNG.'));
      },
      'image/png'
    );
  });
}

/**
 * Main conversion pipeline for a single file item
 */
export async function convertImageFile(
  file: File,
  options: ConversionOptions
): Promise<ConversionResult> {
  const startTime = performance.now();

  const canvas = await fileToCanvas(file, options.svgScale);
  const blob = await canvasToFormat(canvas, options.targetFormat, options);

  const endTime = performance.now();
  const processingTimeMs = Math.round(endTime - startTime);

  return {
    blob,
    width: options.customWidth || canvas.width,
    height: options.customHeight || canvas.height,
    processingTimeMs,
  };
}

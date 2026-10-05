import { SupportedInputFormat } from '../../types/image';

export function formatBytes(bytes: number, decimals: number = 2): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

export function getFileExtension(filename: string): string {
  const parts = filename.split('.');
  if (parts.length <= 1) return '';
  return parts.pop()?.toLowerCase() || '';
}

export function getBaseFilename(filename: string): string {
  const lastDot = filename.lastIndexOf('.');
  if (lastDot === -1) return filename;
  return filename.substring(0, lastDot);
}

export function replaceFileExtension(filename: string, newExt: string): string {
  const base = getBaseFilename(filename);
  const cleanExt = newExt.replace(/^\./, '').toLowerCase();
  return `${base}.${cleanExt}`;
}

export function getSanitizedFilename(filename: string): string {
  return filename.replace(/[/\\?%*:|"<>]/g, '-').trim();
}

export function detectFormatFromFileNameOrMime(file: File): SupportedInputFormat {
  const ext = getFileExtension(file.name);
  const mime = file.type.toLowerCase();

  if (ext === 'jpg' || ext === 'jpeg' || mime === 'image/jpeg') return 'jpg';
  if (ext === 'png' || mime === 'image/png') return 'png';
  if (ext === 'webp' || mime === 'image/webp') return 'webp';
  if (ext === 'avif' || mime === 'image/avif') return 'avif';
  if (ext === 'tiff' || ext === 'tif' || mime === 'image/tiff') return 'tiff';
  if (ext === 'bmp' || mime === 'image/bmp' || mime === 'image/x-ms-bmp') return 'bmp';
  if (ext === 'gif' || mime === 'image/gif') return 'gif';
  if (ext === 'heic' || mime === 'image/heic') return 'heic';
  if (ext === 'heif' || mime === 'image/heif') return 'heif';
  if (ext === 'svg' || mime === 'image/svg+xml') return 'svg';

  return 'png';
}

export function calculateSizeReduction(originalBytes: number, convertedBytes: number): {
  differencePercentage: number;
  isReduced: boolean;
} {
  if (!originalBytes || !convertedBytes) {
    return { differencePercentage: 0, isReduced: false };
  }
  const diff = ((originalBytes - convertedBytes) / originalBytes) * 100;
  const isReduced = diff > 0;
  return {
    differencePercentage: Math.abs(Math.round(diff * 10) / 10),
    isReduced,
  };
}

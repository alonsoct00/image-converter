import { FormatCapability, SupportedOutputFormat } from '../../types/image';

// Check browser canvas export capability
function canBrowserExportFormat(mimeType: string): boolean {
  if (typeof document === 'undefined') return false;
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    const dataUrl = canvas.toDataURL(mimeType);
    return dataUrl.startsWith(`data:${mimeType}`);
  } catch {
    return false;
  }
}

export function getAvailableOutputFormats(): FormatCapability[] {
  const isWebpSupported = canBrowserExportFormat('image/webp');
  const isAvifSupported = canBrowserExportFormat('image/avif');

  return [
    {
      format: 'png',
      label: 'PNG',
      extension: 'png',
      mimeType: 'image/png',
      isSupported: true,
      supportsAlpha: true,
      hasQualityControl: false,
      defaultQuality: 100,
      description: 'Sin pérdida de calidad con transparencia alpha completa.',
    },
    {
      format: 'jpg',
      label: 'JPG / JPEG',
      extension: 'jpg',
      mimeType: 'image/jpeg',
      isSupported: true,
      supportsAlpha: false,
      hasQualityControl: true,
      defaultQuality: 85,
      description: 'Compresión eficiente ideal para fotografías y web.',
    },
    {
      format: 'webp',
      label: 'WebP',
      extension: 'webp',
      mimeType: 'image/webp',
      isSupported: isWebpSupported,
      supportsAlpha: true,
      hasQualityControl: true,
      defaultQuality: 85,
      description: 'Formato moderno de alta compresión con o sin transparencia.',
    },
    {
      format: 'avif',
      label: 'AVIF',
      extension: 'avif',
      mimeType: 'image/avif',
      isSupported: isAvifSupported,
      supportsAlpha: true,
      hasQualityControl: true,
      defaultQuality: 80,
      description: 'Compresión de última generación para máxima reducción de peso.',
    },
    {
      format: 'tiff',
      label: 'TIFF',
      extension: 'tiff',
      mimeType: 'image/tiff',
      isSupported: true, // Supported via UTIF encoder
      supportsAlpha: true,
      hasQualityControl: false,
      defaultQuality: 100,
      description: 'Alta calidad para impresión y edición profesional.',
    },
    {
      format: 'bmp',
      label: 'BMP',
      extension: 'bmp',
      mimeType: 'image/bmp',
      isSupported: true, // Supported via Canvas BMP encoder
      supportsAlpha: false,
      hasQualityControl: false,
      defaultQuality: 100,
      description: 'Mapa de bits estándar sin compresión.',
    },
  ];
}

export function getFormatCapability(format: SupportedOutputFormat): FormatCapability {
  const formats = getAvailableOutputFormats();
  return formats.find((f) => f.format === format) || formats[0];
}

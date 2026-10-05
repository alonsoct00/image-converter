export type SupportedInputFormat =
  | 'jpg'
  | 'jpeg'
  | 'png'
  | 'webp'
  | 'avif'
  | 'tiff'
  | 'tif'
  | 'bmp'
  | 'gif'
  | 'heic'
  | 'heif'
  | 'svg';

export type SupportedOutputFormat =
  | 'jpg'
  | 'png'
  | 'webp'
  | 'avif'
  | 'bmp'
  | 'tiff';

export interface FormatCapability {
  format: SupportedOutputFormat;
  label: string;
  extension: string;
  mimeType: string;
  isSupported: boolean;
  supportsAlpha: boolean;
  hasQualityControl: boolean;
  defaultQuality: number;
  description: string;
}

export interface ConversionOptions {
  targetFormat: SupportedOutputFormat;
  quality: number; // 1-100
  transparencyFill: string; // Used when converting transparent images to JPG/BMP (e.g. #FFFFFF)
  maintainTransparency: boolean;
  lossless: boolean;
  svgScale: number; // For SVG input scaling (1x, 2x, 3x, 4x)
  customWidth?: number;
  customHeight?: number;
}

export type ConversionStatus = 'idle' | 'processing' | 'success' | 'error';

export interface ImageFileItem {
  id: string;
  file: File;
  name: string;
  originalFormat: SupportedInputFormat;
  originalSize: number;
  originalDimensions?: {
    width: number;
    height: number;
  };
  previewUrl: string;
  options: ConversionOptions;
  status: ConversionStatus;
  progress: number;
  convertedBlob?: Blob;
  convertedUrl?: string;
  convertedSize?: number;
  convertedDimensions?: {
    width: number;
    height: number;
  };
  errorMessage?: string;
  processingTimeMs?: number;
}

export interface ComparisonData {
  item: ImageFileItem;
  originalSizeFormatted: string;
  convertedSizeFormatted: string;
  sizeDifferencePercentage: number;
  isSizeReduced: boolean;
}

export interface BackgroundRemovalOptions {
  outputFormat?: 'png' | 'webp';
  fillColor?: string;
  signal?: AbortSignal;
}

export interface BackgroundRemovalResult {
  blob: Blob;
  previewUrl: string;
  originalWidth: number;
  originalHeight: number;
  processingTimeMs: number;
  provider: 'nano-banana' | 'gemini' | 'local-segmentation';
}

export interface BackgroundRemovalService {
  removeBackground(image: File, options?: BackgroundRemovalOptions): Promise<Blob>;
}

export type CanvasBackgroundType = 'transparent' | 'white' | 'black' | 'custom-color' | 'custom-image';

export interface BackgroundEditOptions {
  backgroundType: CanvasBackgroundType;
  customColor: string;
  backgroundImageUrl?: string;
  padding: number; // 0 to 100
  scale: number; // 0.5 to 1.5
  center: boolean;
  exportFormat: 'png' | 'webp' | 'jpg';
  exportQuality: number;
}

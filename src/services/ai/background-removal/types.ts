export interface BackgroundRemovalOptions {
  outputFormat?: 'png' | 'webp';
  signal?: AbortSignal;
}

export interface BackgroundRemovalService {
  removeBackground(
    image: File,
    options?: BackgroundRemovalOptions
  ): Promise<Blob>;
}

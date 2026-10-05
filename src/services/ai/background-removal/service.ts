import { BackgroundRemovalService } from './types';
import { NanoBananaBackgroundRemovalService } from './nano-banana';

// Singleton instance of BackgroundRemovalService using Nano Banana provider
export const backgroundRemovalService: BackgroundRemovalService =
  new NanoBananaBackgroundRemovalService('/api/remove-background');

export * from './types';
export * from './nano-banana';

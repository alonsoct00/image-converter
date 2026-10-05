import {
  BackgroundRemovalOptions,
  CanvasBackgroundType,
} from '../../types/ai';

export type AIProviderId = 'nano-banana' | 'chatgpt' | 'local';
export type AIProviderSelection = 'auto' | 'nano-banana' | 'chatgpt';

export type EnhanceOperation =
  | 'enhance'
  | 'sharpen'
  | 'denoise'
  | 'upscale'
  | 'lighting'
  | 'color'
  | 'restore'
  | 'optimize-web'
  | 'custom'
  | 'remove-background';

export interface EnhanceOptions {
  operation: EnhanceOperation;
  prompt?: string;
  upscaleFactor?: 2 | 4;
  removeMetadata?: boolean;
  signal?: AbortSignal;
  backgroundType?: CanvasBackgroundType;
  customColor?: string;
  backgroundImageUrl?: string;
  padding?: number;
  scale?: number;
  center?: boolean;
  outputFormat?: 'png' | 'webp' | 'jpg';
  outputQuality?: number;
}

export interface EnhanceResult {
  blob: Blob;
  previewUrl: string;
  originalWidth: number;
  originalHeight: number;
  newWidth: number;
  newHeight: number;
  originalSize: number;
  newSize: number;
  providerUsed: AIProviderId;
  providerName: string;
  processingTimeMs: number;
  usedAi: boolean;
}

export interface ImageAIProvider {
  id: AIProviderId;
  name: string;
  description: string;
  enhance(image: File, options: EnhanceOptions): Promise<Blob>;
  removeBackground(image: File, options?: BackgroundRemovalOptions): Promise<Blob>;
}

export interface AICapabilityConfig {
  preferredProvider: AIProviderId;
  supportsAlpha: boolean;
  isAiPowered: boolean;
  defaultPrompt?: string;
}

/**
 * Central capability mapping matrix (Section 14)
 */
export const AI_CAPABILITIES: Record<EnhanceOperation, AICapabilityConfig> = {
  enhance: {
    preferredProvider: 'nano-banana',
    supportsAlpha: false,
    isAiPowered: true,
    defaultPrompt: 'Mejora la calidad general de la imagen, optimizando claridad, texturas y balance visual sin alterar la composición.',
  },
  sharpen: {
    preferredProvider: 'nano-banana',
    supportsAlpha: false,
    isAiPowered: true,
    defaultPrompt: 'Aumenta la nitidez y definición de bordes y detalles finos de la imagen, evitando artefactos o halos.',
  },
  denoise: {
    preferredProvider: 'nano-banana',
    supportsAlpha: false,
    isAiPowered: true,
    defaultPrompt: 'Reduce y elimina el ruido digital y grano manteniendo los bordes nítidos y la textura natural.',
  },
  upscale: {
    preferredProvider: 'nano-banana',
    supportsAlpha: false,
    isAiPowered: true,
    defaultPrompt: 'Aumenta la resolución y detalle visual de la imagen con superresolución ultra nítida.',
  },
  lighting: {
    preferredProvider: 'chatgpt',
    supportsAlpha: false,
    isAiPowered: true,
    defaultPrompt: 'Mejora la iluminación, exposición y rango dinámico, levantando sombras y equilibrando altas luces de forma fotográfica natural.',
  },
  color: {
    preferredProvider: 'chatgpt',
    supportsAlpha: false,
    isAiPowered: true,
    defaultPrompt: 'Mejora el color, saturación natural, contraste y balance de blancos con gradación de color profesional.',
  },
  restore: {
    preferredProvider: 'chatgpt',
    supportsAlpha: false,
    isAiPowered: true,
    defaultPrompt: 'Restaura esta fotografía antigua o deteriorada, corrigiendo grietas, arañazos, manchas y desvanecimiento mientras preservas fielmente rostros y características originales.',
  },
  'optimize-web': {
    preferredProvider: 'local',
    supportsAlpha: true,
    isAiPowered: false, // Traditional optimization - no unnecessary AI cost!
  },
  custom: {
    preferredProvider: 'chatgpt',
    supportsAlpha: false,
    isAiPowered: true,
    defaultPrompt: '',
  },
  'remove-background': {
    preferredProvider: 'nano-banana',
    supportsAlpha: true,
    isAiPowered: true,
  },
};

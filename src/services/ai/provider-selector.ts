import {
  AIProviderId,
  AIProviderSelection,
  EnhanceOperation,
  ImageAIProvider,
  AI_CAPABILITIES,
} from './types';
import { NanoBananaProvider } from './nano-banana/nano-banana-provider';
import { ChatGPTProvider } from './chatgpt/chatgpt-provider';
import { LocalProvider } from './local/local-provider';

// Singleton instances of providers
const nanoBananaInstance = new NanoBananaProvider();
const chatGptInstance = new ChatGPTProvider();
const localInstance = new LocalProvider();

const PROVIDER_REGISTRY: Record<AIProviderId, ImageAIProvider> = {
  'nano-banana': nanoBananaInstance,
  chatgpt: chatGptInstance,
  local: localInstance,
};

/**
 * Automatically selects the most suitable provider based on operation capabilities (Section 14)
 */
export function selectBestProvider(operation: EnhanceOperation): ImageAIProvider {
  const config = AI_CAPABILITIES[operation];
  if (!config) return nanoBananaInstance;

  const providerId = config.preferredProvider;
  return PROVIDER_REGISTRY[providerId] || nanoBananaInstance;
}

/**
 * Returns the resolved provider strategy according to user selection (Section 11)
 * Eliminates scattered if/else branches across UI components.
 */
export function getAIProvider(
  selection: AIProviderSelection,
  operation: EnhanceOperation
): ImageAIProvider {
  if (selection === 'auto') {
    return selectBestProvider(operation);
  }

  return PROVIDER_REGISTRY[selection] || selectBestProvider(operation);
}

export function getAllProviders(): ImageAIProvider[] {
  return [nanoBananaInstance, chatGptInstance];
}

import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  UploadCloud,
  Download,
  RotateCcw,
  Sliders,
  AlertTriangle,
  Layers,
  Wand2,
  CheckCircle2,
  Cpu,
  Palette,
  Sun,
  Maximize2,
  Shield,
  HelpCircle,
} from 'lucide-react';
import {
  AIProviderSelection,
  EnhanceOperation,
  EnhanceOptions,
  AI_CAPABILITIES,
  AIProviderId,
} from '../../services/ai/types';
import { getAIProvider, selectBestProvider } from '../../services/ai/provider-selector';
import { backgroundRemovalService } from '../../services/ai/background-removal/service';
import { formatBytes, calculateSizeReduction } from '../../utils/file/format';
import { downloadBlob } from '../../utils/download/downloader';
import { getImageDimensions } from '../../utils/image/dimensions';
import { validateFileSize } from '../../utils/file/security';
import { CanvasBackgroundType } from '../../types/ai';

export const AIEnhanceView: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [originalPreviewUrl, setOriginalPreviewUrl] = useState<string | null>(null);
  const [originalDimensions, setOriginalDimensions] = useState<{ width: number; height: number } | null>(null);

  // Enhancement controls
  const [providerSelection, setProviderSelection] = useState<AIProviderSelection>('auto');
  const [operation, setOperation] = useState<EnhanceOperation>('enhance');
  const [customPrompt, setCustomPrompt] = useState<string>('');
  const [upscaleFactor, setUpscaleFactor] = useState<2 | 4>(2);
  const [removeMetadata, setRemoveMetadata] = useState<boolean>(true);

  // Remove background options if operation === 'remove-background'
  const [bgType, setBgType] = useState<CanvasBackgroundType>('transparent');
  const [customBgColor, setCustomBgColor] = useState<string>('#ffffff');
  const [customBgImageFile, setCustomBgImageFile] = useState<File | null>(null);
  const [customBgImageUrl, setCustomBgImageUrl] = useState<string | null>(null);
  const [bgScale, setBgScale] = useState<number>(1);
  const [bgPadding, setBgPadding] = useState<number>(0);

  // Export format
  const [downloadFormat, setDownloadFormat] = useState<'png' | 'jpg' | 'webp' | 'avif'>('png');
  const [jpgFillColor, setJpgFillColor] = useState<string>('#ffffff');

  // State
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);
  const [resultPreviewUrl, setResultPreviewUrl] = useState<string | null>(null);
  const [resultDimensions, setResultDimensions] = useState<{ width: number; height: number } | null>(null);
  const [resolvedProvider, setResolvedProvider] = useState<AIProviderId>('nano-banana');
  const [processingTimeMs, setProcessingTimeMs] = useState<number | null>(null);

  // Before / After slider state (0 to 100)
  const [sliderPosition, setSliderPosition] = useState<number>(50);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const customBgInputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Cleanup object URLs on unmount
  useEffect(() => {
    return () => {
      if (originalPreviewUrl) URL.revokeObjectURL(originalPreviewUrl);
      if (resultPreviewUrl) URL.revokeObjectURL(resultPreviewUrl);
      if (customBgImageUrl) URL.revokeObjectURL(customBgImageUrl);
    };
  }, []);

  const handleFileSelect = async (file: File) => {
    const validation = validateFileSize(file);
    if (!validation.valid) {
      setErrorMessage(validation.error || 'Invalid file size.');
      return;
    }

    setErrorMessage(null);
    setSelectedFile(file);
    setResultBlob(null);
    setResultDimensions(null);
    if (resultPreviewUrl) {
      URL.revokeObjectURL(resultPreviewUrl);
      setResultPreviewUrl(null);
    }

    const preview = URL.createObjectURL(file);
    setOriginalPreviewUrl(preview);

    try {
      const dims = await getImageDimensions(file);
      setOriginalDimensions(dims);
    } catch {
      // Dimensions optional
    }
  };

  const handleEnhance = async () => {
    if (!selectedFile) return;

    setIsProcessing(true);
    setErrorMessage(null);
    setProcessingStatus('Starting AI processing...');

    const startTime = performance.now();
    abortControllerRef.current = new AbortController();

    try {
      // Resolve provider strategy
      const provider = getAIProvider(providerSelection, operation);
      setResolvedProvider(provider.id);

      setProcessingStatus(
        operation === 'optimize-web'
          ? 'Optimizing image for web without unnecessary AI cost...'
          : `Processing with ${provider.name}...`
      );

      const options: EnhanceOptions = {
        operation,
        prompt: operation === 'custom' ? customPrompt : AI_CAPABILITIES[operation]?.defaultPrompt,
        upscaleFactor,
        removeMetadata,
        backgroundType: bgType,
        customColor: customBgColor,
        backgroundImageUrl: customBgImageUrl || undefined,
        signal: abortControllerRef.current.signal,
      };

      let outputBlob: Blob;
      if (operation === 'remove-background') {
        if (providerSelection === 'chatgpt') {
          outputBlob = await provider.removeBackground(selectedFile, {
            outputFormat: 'png',
            signal: abortControllerRef.current.signal,
          });
        } else {
          // Consistently invokes the existing background removal service
          outputBlob = await backgroundRemovalService.removeBackground(selectedFile, {
            outputFormat: 'png',
            signal: abortControllerRef.current.signal,
          });
        }
      } else {
        outputBlob = await provider.enhance(selectedFile, options);
      }

      const endTime = performance.now();
      setProcessingTimeMs(Math.round(endTime - startTime));
      setResultBlob(outputBlob);

      if (resultPreviewUrl) URL.revokeObjectURL(resultPreviewUrl);
      const url = URL.createObjectURL(outputBlob);
      setResultPreviewUrl(url);

      // Extract new dimensions
      try {
        const dims = await getImageDimensions(outputBlob);
        setResultDimensions(dims);
      } catch {
        if (originalDimensions) {
          if (operation === 'upscale') {
            setResultDimensions({
              width: originalDimensions.width * upscaleFactor,
              height: originalDimensions.height * upscaleFactor,
            });
          } else {
            setResultDimensions(originalDimensions);
          }
        }
      }
    } catch (err: unknown) {
      console.error('Enhancement error:', err);
      if (err instanceof Error) {
        if (err.name === 'AbortError') {
          setErrorMessage('Operation cancelled.');
        } else {
          setErrorMessage("We couldn't process your image with this AI provider.");
        }
      } else {
        setErrorMessage("We couldn't process your image with this AI provider.");
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = async () => {
    if (!resultBlob || !selectedFile) return;

    let finalBlob = resultBlob;
    const baseName = selectedFile.name.substring(0, selectedFile.name.lastIndexOf('.')) || selectedFile.name;

    // If remove-background with custom background style, scale, or padding:
    if (
      operation === 'remove-background' &&
      (bgType !== 'transparent' || bgScale !== 1 || bgPadding > 0 || customBgImageUrl)
    ) {
      try {
        const img = new Image();
        const url = URL.createObjectURL(resultBlob);
        await new Promise((res, rej) => {
          img.onload = res;
          img.onerror = rej;
          img.src = url;
        });

        const width = originalDimensions?.width || img.naturalWidth || img.width;
        const height = originalDimensions?.height || img.naturalHeight || img.height;

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          if (bgType === 'white') {
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, width, height);
          } else if (bgType === 'black') {
            ctx.fillStyle = '#000000';
            ctx.fillRect(0, 0, width, height);
          } else if (bgType === 'custom-color') {
            ctx.fillStyle = customBgColor;
            ctx.fillRect(0, 0, width, height);
          } else if (bgType === 'custom-image' && customBgImageUrl) {
            try {
              const bgImg = new Image();
              await new Promise((res, rej) => {
                bgImg.onload = res;
                bgImg.onerror = rej;
                bgImg.src = customBgImageUrl;
              });
              ctx.drawImage(bgImg, 0, 0, width, height);
            } catch {}
          }

          const pad = bgPadding;
          const scale = bgScale;
          const availW = Math.max(10, width - pad * 2);
          const availH = Math.max(10, height - pad * 2);
          const drawW = availW * scale;
          const drawH = availH * scale;
          const drawX = (width - drawW) / 2;
          const drawY = (height - drawH) / 2;
          ctx.drawImage(img, drawX, drawY, drawW, drawH);

          const mimeType = downloadFormat === 'jpg' ? 'image/jpeg' : `image/${downloadFormat}`;
          const converted = await new Promise<Blob | null>((resolve) => {
            canvas.toBlob((b) => resolve(b), mimeType, 0.95);
          });
          if (converted) finalBlob = converted;
        }
        URL.revokeObjectURL(url);
      } catch {}
    } else if (downloadFormat === 'jpg' || (downloadFormat !== 'png' && resultBlob.type !== `image/${downloadFormat}`)) {
      // Standard format conversion
      try {
        const img = new Image();
        const url = URL.createObjectURL(resultBlob);
        await new Promise((res, rej) => {
          img.onload = res;
          img.onerror = rej;
          img.src = url;
        });

        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          if (downloadFormat === 'jpg') {
            ctx.fillStyle = jpgFillColor || '#ffffff';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
          }
          ctx.drawImage(img, 0, 0);

          const mimeType = downloadFormat === 'jpg' ? 'image/jpeg' : `image/${downloadFormat}`;
          const converted = await new Promise<Blob | null>((resolve) => {
            canvas.toBlob((b) => resolve(b), mimeType, 0.9);
          });
          if (converted) finalBlob = converted;
        }
        URL.revokeObjectURL(url);
      } catch {
        // Fallback to original resultBlob
      }
    }

    const filename = `${baseName}-${operation}.${downloadFormat}`;
    downloadBlob(finalBlob, filename);
  };

  const handleReset = () => {
    if (abortControllerRef.current) abortControllerRef.current.abort();
    setSelectedFile(null);
    setResultBlob(null);
    setResultDimensions(null);
    if (originalPreviewUrl) URL.revokeObjectURL(originalPreviewUrl);
    if (resultPreviewUrl) URL.revokeObjectURL(resultPreviewUrl);
    setOriginalPreviewUrl(null);
    setResultPreviewUrl(null);
    setErrorMessage(null);
  };

  // Size comparison
  const sizeDiff =
    selectedFile && resultBlob
      ? calculateSizeReduction(selectedFile.size, resultBlob.size)
      : null;

  const currentCap = AI_CAPABILITIES[operation];

  return (
    <div className="max-w-5xl mx-auto py-2">
      {/* Title */}
      <div className="text-center max-w-2xl mx-auto mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200/80 text-blue-700 text-xs font-semibold uppercase tracking-wider mb-2">
          <Sparkles className="w-3.5 h-3.5 text-blue-600" />
          <span>Intelligent Processing Suite</span>
        </div>
        <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
          AI Image Enhancement
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          Improve your image using AI. Sharpen, denoise, upscale, adjust lighting, colorize, and restore photos with precision.
        </p>
      </div>

      {/* Upload Zone when no file is selected */}
      {!selectedFile && (
        <div className="max-w-2xl mx-auto">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                handleFileSelect(e.target.files[0]);
              }
            }}
            className="hidden"
          />

          <div
            role="button"
            tabIndex={0}
            onClick={() => fileInputRef.current?.click()}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                fileInputRef.current?.click();
              }
            }}
            className="border-2 border-dashed border-slate-300 hover:border-blue-500 bg-white hover:bg-slate-50/80 rounded-3xl p-12 text-center cursor-pointer transition-all shadow-xs group outline-none focus:ring-4 focus:ring-blue-100"
          >
            <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
              <UploadCloud className="w-8 h-8" />
            </div>

            <h3 className="text-xl font-bold text-slate-900 mb-1">
              Drop your image here
            </h3>
            <p className="text-xs text-slate-500 mb-6">
              or select a file from your computer (JPG, PNG, WebP, TIFF, AVIF, HEIC up to 50 MB)
            </p>

            <button
              type="button"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold shadow-xs hover:bg-blue-700 pointer-events-none"
            >
              <Wand2 className="w-4 h-4" />
              <span>Select image</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Enhancer Workspace */}
      {selectedFile && (
        <div className="space-y-6">
          {/* File Header Bar */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4 shadow-xs">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden shrink-0">
                {originalPreviewUrl && (
                  <img
                    src={originalPreviewUrl}
                    alt="Original"
                    className="w-full h-full object-cover"
                  />
                )}
              </div>
              <div className="min-w-0">
                <h4 className="text-sm font-semibold text-slate-900 truncate max-w-xs sm:max-w-md">
                  {selectedFile.name}
                </h4>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <span>{formatBytes(selectedFile.size)}</span>
                  {originalDimensions && (
                    <>
                      <span>•</span>
                      <span>
                        {originalDimensions.width} × {originalDimensions.height} px
                      </span>
                    </>
                  )}
                  {processingTimeMs && (
                    <>
                      <span>•</span>
                      <span className="text-emerald-600 font-medium">
                        {processingTimeMs} ms
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleReset}
                disabled={isProcessing}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-40"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Change image</span>
              </button>
            </div>
          </div>

          {/* Configuration Controls Bar */}
          <div className="bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-6 shadow-xs space-y-5">
            {/* Quick Action Chips Bar */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              <span className="text-xs font-semibold text-slate-500 mr-1 shrink-0">Acceso rápido:</span>
              <button
                type="button"
                onClick={() => setOperation('enhance')}
                disabled={isProcessing}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium shrink-0 transition-all ${
                  operation === 'enhance'
                    ? 'bg-blue-600 text-white shadow-xs font-bold'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                ✨ Enhance
              </button>
              <button
                type="button"
                onClick={() => {
                  setOperation('remove-background');
                  setBgType('transparent');
                  setDownloadFormat('png');
                }}
                disabled={isProcessing}
                className={`px-3.5 py-1.5 rounded-xl text-xs shrink-0 transition-all flex items-center gap-1.5 ${
                  operation === 'remove-background'
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/25 font-bold ring-2 ring-emerald-400'
                    : 'bg-emerald-50 text-emerald-800 border border-emerald-300 hover:bg-emerald-100 font-semibold'
                }`}
              >
                <span>✂️ Quitar fondo (Sin fondo)</span>
                <span className="text-[10px] uppercase font-bold px-1.5 py-0.2 rounded bg-emerald-200/80 text-emerald-900">
                  Alpha
                </span>
              </button>
              <button
                type="button"
                onClick={() => setOperation('upscale')}
                disabled={isProcessing}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium shrink-0 transition-all ${
                  operation === 'upscale'
                    ? 'bg-blue-600 text-white shadow-xs font-bold'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                📐 Upscale
              </button>
              <button
                type="button"
                onClick={() => setOperation('lighting')}
                disabled={isProcessing}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium shrink-0 transition-all ${
                  operation === 'lighting'
                    ? 'bg-blue-600 text-white shadow-xs font-bold'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                ☀️ Lighting
              </button>
              <button
                type="button"
                onClick={() => setOperation('color')}
                disabled={isProcessing}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium shrink-0 transition-all ${
                  operation === 'color'
                    ? 'bg-blue-600 text-white shadow-xs font-bold'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                🎨 Color
              </button>
              <button
                type="button"
                onClick={() => setOperation('restore')}
                disabled={isProcessing}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium shrink-0 transition-all ${
                  operation === 'restore'
                    ? 'bg-blue-600 text-white shadow-xs font-bold'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                🕰️ Restore
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {/* 1. AI Engine Selector (Section 2) */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  AI Engine:
                </label>
                <select
                  value={providerSelection}
                  onChange={(e) => setProviderSelection(e.target.value as AIProviderSelection)}
                  disabled={isProcessing}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer disabled:opacity-50"
                >
                  <option value="auto">Auto (Recommended engine)</option>
                  <option value="nano-banana">Nano Banana</option>
                  <option value="chatgpt">ChatGPT</option>
                </select>
                <p className="mt-1 text-[11px] text-slate-500">
                  {providerSelection === 'auto'
                    ? `Auto-routed to ${selectBestProvider(operation).name} for this task`
                    : providerSelection === 'nano-banana'
                    ? 'Specialized for high-fidelity cutouts, details and textures'
                    : 'Specialized for semantic understanding, relighting and photo restoration'}
                </p>
              </div>

              {/* 2. Operation Selector (Section 4) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-700">
                    Operation:
                  </label>
                  {operation === 'remove-background' && (
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Sin fondo (Alpha)
                    </span>
                  )}
                </div>
                <select
                  value={operation}
                  onChange={(e) => {
                    const op = e.target.value as EnhanceOperation;
                    setOperation(op);
                    if (op === 'remove-background') {
                      setBgType('transparent');
                      setDownloadFormat('png');
                    }
                  }}
                  disabled={isProcessing}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer disabled:opacity-50"
                >
                  <option value="enhance">✨ Enhance (Overall quality)</option>
                  <option value="remove-background">✂️ Remove Background</option>
                  <option value="upscale">📐 Upscale (Higher resolution 2x/4x)</option>
                  <option value="sharpen">🔍 Sharpen (Crisp edge clarity)</option>
                  <option value="denoise">🔇 Denoise (Grain & noise removal)</option>
                  <option value="lighting">☀️ Lighting (Dynamic range & exposure)</option>
                  <option value="color">🎨 Color (Color grading & vibrance)</option>
                  <option value="restore">🕰️ Restore (Old/degraded photo restoration)</option>
                  <option value="optimize-web">⚡ Optimize for Web (Fast deterministic optimization)</option>
                  <option value="custom">✍️ Custom AI Edit (User prompt)</option>
                </select>
                <p className="mt-1 text-[11px] text-slate-500">
                  {operation === 'remove-background'
                    ? 'Elimina el fondo y devuelve la imagen transparente sobre patrón de damero.'
                    : operation === 'optimize-web'
                    ? 'Uses zero AI credits; applies high-efficiency deterministic compression'
                    : currentCap?.isAiPowered
                    ? 'Applies state-of-the-art neural vision processing'
                    : ''}
                </p>
              </div>

              {/* 3. Metadata and Options */}
              <div className="flex flex-col justify-between">
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Privacy & Output Options:
                </label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={removeMetadata}
                      onChange={(e) => setRemoveMetadata(e.target.checked)}
                      disabled={isProcessing}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span>Remove sensitive EXIF metadata</span>
                  </label>

                  <div className="text-[11px] text-slate-500 flex items-center gap-1">
                    <Shield className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Processed securely without permanent storage</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Contextual Options Drawer */}
            {/* Upscale options */}
            {operation === 'upscale' && (
              <div className="pt-3 border-t border-slate-100 flex items-center gap-3">
                <span className="text-xs font-semibold text-slate-700">Upscale Factor:</span>
                <button
                  type="button"
                  onClick={() => setUpscaleFactor(2)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    upscaleFactor === 2
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  2x Resolution
                </button>
                <button
                  type="button"
                  onClick={() => setUpscaleFactor(4)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    upscaleFactor === 4
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  4x Resolution
                </button>
                {originalDimensions && (
                  <span className="text-xs text-slate-500 ml-2">
                    Target: {originalDimensions.width * upscaleFactor} × {originalDimensions.height * upscaleFactor} px
                  </span>
                )}
              </div>
            )}

            {/* Custom Prompt input (Section 5) */}
            {operation === 'custom' && (
              <div className="pt-3 border-t border-slate-100 space-y-2">
                <label className="block text-xs font-semibold text-slate-700">
                  Custom AI Instruction:
                </label>
                <textarea
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  placeholder="e.g.: Mejora la iluminación, aumenta ligeramente la nitidez y elimina el ruido de la imagen..."
                  rows={2}
                  disabled={isProcessing}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <div className="flex flex-wrap gap-1.5 text-[11px] text-slate-500">
                  <span className="font-semibold">Quick presets:</span>
                  <button
                    type="button"
                    onClick={() =>
                      setCustomPrompt(
                        'Mejora la iluminación, aumenta ligeramente la nitidez y elimina el ruido de la imagen.'
                      )
                    }
                    className="underline hover:text-blue-600"
                  >
                    Luz & nitidez
                  </button>
                  <span>•</span>
                  <button
                    type="button"
                    onClick={() =>
                      setCustomPrompt(
                        'Haz que esta fotografía parezca tomada con una cámara profesional reflex.'
                      )
                    }
                    className="underline hover:text-blue-600"
                  >
                    Estilo profesional
                  </button>
                  <span>•</span>
                  <button
                    type="button"
                    onClick={() =>
                      setCustomPrompt(
                        'Restaura esta fotografía antigua manteniendo los rostros y las características originales.'
                      )
                    }
                    className="underline hover:text-blue-600"
                  >
                    Restaurar rostros
                  </button>
                </div>
              </div>
            )}

            {/* Remove Background options (Section 6) */}
            {operation === 'remove-background' && (
              <div className="pt-3 border-t border-slate-100 space-y-4">
                <div>
                  <span className="text-xs font-semibold text-slate-700 block mb-2">
                    Background Style:
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => setBgType('transparent')}
                      className={`p-2 rounded-xl border text-center font-medium transition-all ${
                        bgType === 'transparent'
                          ? 'border-emerald-600 bg-emerald-50 text-emerald-900 font-bold ring-1 ring-emerald-500'
                          : 'border-slate-200 hover:border-slate-300 text-slate-700'
                      }`}
                    >
                      Transparent (Alpha)
                    </button>
                    <button
                      type="button"
                      onClick={() => setBgType('white')}
                      className={`p-2 rounded-xl border text-center font-medium transition-all ${
                        bgType === 'white'
                          ? 'border-blue-600 bg-blue-50 text-blue-900 font-bold'
                          : 'border-slate-200 hover:border-slate-300 text-slate-700'
                      }`}
                    >
                      White
                    </button>
                    <button
                      type="button"
                      onClick={() => setBgType('black')}
                      className={`p-2 rounded-xl border text-center font-medium transition-all ${
                        bgType === 'black'
                          ? 'border-blue-600 bg-slate-900 text-white font-bold'
                          : 'border-slate-200 hover:border-slate-300 text-slate-700'
                      }`}
                    >
                      Black
                    </button>
                    <button
                      type="button"
                      onClick={() => setBgType('custom-color')}
                      className={`p-2 rounded-xl border text-center font-medium transition-all ${
                        bgType === 'custom-color'
                          ? 'border-blue-600 bg-blue-50 text-blue-900 font-bold'
                          : 'border-slate-200 hover:border-slate-300 text-slate-700'
                      }`}
                    >
                      Custom Color
                    </button>
                    <button
                      type="button"
                      onClick={() => customBgInputRef.current?.click()}
                      className={`p-2 rounded-xl border text-center font-medium transition-all ${
                        bgType === 'custom-image'
                          ? 'border-blue-600 bg-blue-50 text-blue-900 font-bold'
                          : 'border-slate-200 hover:border-slate-300 text-slate-700'
                      }`}
                    >
                      Custom Image
                    </button>
                  </div>

                  <input
                    ref={customBgInputRef}
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        const file = e.target.files[0];
                        setCustomBgImageFile(file);
                        if (customBgImageUrl) URL.revokeObjectURL(customBgImageUrl);
                        const url = URL.createObjectURL(file);
                        setCustomBgImageUrl(url);
                        setBgType('custom-image');
                      }
                    }}
                    className="hidden"
                  />

                  {bgType === 'custom-color' && (
                    <div className="flex items-center gap-2 pt-2">
                      <input
                        type="color"
                        value={customBgColor}
                        onChange={(e) => setCustomBgColor(e.target.value)}
                        className="w-8 h-8 rounded-lg cursor-pointer border border-slate-300 p-0"
                      />
                      <span className="text-xs font-mono text-slate-700 font-semibold">{customBgColor}</span>
                    </div>
                  )}

                  {bgType === 'custom-image' && customBgImageFile && (
                    <div className="flex items-center gap-2 pt-2 text-xs text-slate-600">
                      <span>Fondo personalizado:</span>
                      <strong className="text-slate-800 truncate max-w-xs">{customBgImageFile.name}</strong>
                    </div>
                  )}
                </div>

                {/* Subject Scale and Margin Sliders */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                  <div>
                    <div className="flex justify-between text-xs text-slate-600 mb-1">
                      <span className="font-medium">Subject Scale:</span>
                      <span className="font-bold text-slate-800">{Math.round(bgScale * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0.5"
                      max="1.5"
                      step="0.05"
                      value={bgScale}
                      onChange={(e) => setBgScale(parseFloat(e.target.value))}
                      className="w-full accent-blue-600 cursor-pointer"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-xs text-slate-600 mb-1">
                      <span className="font-medium">Subject Margin / Padding:</span>
                      <span className="font-bold text-slate-800">{bgPadding} px</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="80"
                      step="5"
                      value={bgPadding}
                      onChange={(e) => setBgPadding(parseInt(e.target.value, 10))}
                      className="w-full accent-blue-600 cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Cost-Aware Action Button (Section 16: No AI calls while user adjusts sliders/options!) */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs text-slate-500">
                Ready to process with{' '}
                <strong>
                  {providerSelection === 'auto'
                    ? selectBestProvider(operation).name
                    : providerSelection === 'nano-banana'
                    ? 'Nano Banana'
                    : 'ChatGPT'}
                </strong>
              </span>

              <button
                type="button"
                onClick={handleEnhance}
                disabled={isProcessing}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 transition-all active:scale-[0.98] disabled:opacity-50"
              >
                <Sparkles className="w-4 h-4" />
                <span>{isProcessing ? 'Processing...' : '✨ Enhance image'}</span>
              </button>
            </div>
          </div>

          {/* Error Message with Provider Switcher (Section 15) */}
          {errorMessage && (
            <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-xs text-red-700 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
                <span>{errorMessage}</span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleEnhance}
                  className="font-bold underline hover:text-red-900"
                >
                  Try again
                </button>
                {providerSelection === 'auto' && (
                  <button
                    type="button"
                    onClick={() => {
                      const alt = resolvedProvider === 'nano-banana' ? 'chatgpt' : 'nano-banana';
                      setProviderSelection(alt);
                      setTimeout(() => handleEnhance(), 50);
                    }}
                    className="font-bold underline text-blue-700 hover:text-blue-900"
                  >
                    Try another AI engine
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Processing State */}
          {isProcessing && (
            <div className="bg-white rounded-3xl border border-slate-200/90 p-12 text-center shadow-xs flex flex-col items-center justify-center min-h-[300px]">
              <div className="relative mb-5">
                <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center animate-pulse">
                  <Sparkles className="w-7 h-7" />
                </div>
                <div className="absolute -inset-2 rounded-3xl border-2 border-blue-500/30 animate-spin border-t-blue-600" />
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-1">{processingStatus}</h3>
              <p className="text-xs text-slate-500">
                Applying non-destructive neural enhancement. Please wait a moment.
              </p>
            </div>
          )}

          {/* Results: Before / After Interactive Slider & Info (Section 8 & 9) */}
          {resultBlob && !isProcessing && resultPreviewUrl && (
            <div className="bg-white rounded-3xl border border-slate-200/90 overflow-hidden shadow-xs space-y-4 p-5 sm:p-6">
              {/* Info comparison header (Section 9) */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-200/80 text-center text-xs">
                <div>
                  <span className="block text-[11px] font-medium text-slate-400 uppercase tracking-wider">
                    Original
                  </span>
                  <span className="text-sm font-bold text-slate-800">
                    {formatBytes(selectedFile.size)}
                  </span>
                  {originalDimensions && (
                    <span className="block text-[11px] text-slate-500">
                      {originalDimensions.width} × {originalDimensions.height} px
                    </span>
                  )}
                </div>

                <div>
                  <span className="block text-[11px] font-medium text-slate-400 uppercase tracking-wider">
                    Enhanced
                  </span>
                  <span className="text-sm font-bold text-slate-800">
                    {formatBytes(resultBlob.size)}
                  </span>
                  {resultDimensions && (
                    <span className="block text-[11px] text-slate-500">
                      {resultDimensions.width} × {resultDimensions.height} px
                    </span>
                  )}
                </div>

                <div>
                  <span className="block text-[11px] font-medium text-slate-400 uppercase tracking-wider">
                    Size Delta
                  </span>
                  {sizeDiff ? (
                    <span
                      className={`text-sm font-extrabold ${
                        sizeDiff.isReduced ? 'text-emerald-600' : 'text-blue-600'
                      }`}
                    >
                      {sizeDiff.isReduced
                        ? `Reduced by ${sizeDiff.differencePercentage}%`
                        : `Size increased by ${sizeDiff.differencePercentage}%`}
                    </span>
                  ) : (
                    <span>—</span>
                  )}
                  <span className="block text-[11px] text-slate-500">
                    {operation.toUpperCase()}
                  </span>
                </div>

                <div>
                  <span className="block text-[11px] font-medium text-slate-400 uppercase tracking-wider">
                    AI Engine
                  </span>
                  <span className="text-sm font-bold text-slate-800">
                    {resolvedProvider === 'chatgpt'
                      ? 'ChatGPT'
                      : resolvedProvider === 'nano-banana'
                      ? 'Nano Banana'
                      : 'Local Engine'}
                  </span>
                  <span className="block text-[11px] text-emerald-600 font-medium">
                    {processingTimeMs} ms
                  </span>
                </div>
              </div>

              {/* Synchronized Before / After Slider (Section 8) */}
              <div className="relative w-full max-w-3xl mx-auto h-[380px] sm:h-[460px] flex items-center justify-center select-none overflow-hidden rounded-2xl border border-slate-300 shadow-inner bg-slate-100">
                {/* Result Image (AFTER) in Background */}
                <div
                  className="w-full h-full flex items-center justify-center p-2"
                  style={{
                    backgroundColor:
                      operation === 'remove-background' && bgType === 'white'
                        ? '#FFFFFF'
                        : operation === 'remove-background' && bgType === 'black'
                        ? '#000000'
                        : operation === 'remove-background' && bgType === 'custom-color'
                        ? customBgColor
                        : '#ffffff',
                    backgroundImage:
                      operation === 'remove-background' && bgType === 'transparent'
                        ? `linear-gradient(45deg, #cbd5e1 25%, transparent 25%),
                           linear-gradient(-45deg, #cbd5e1 25%, transparent 25%),
                           linear-gradient(45deg, transparent 75%, #cbd5e1 75%),
                           linear-gradient(-45deg, transparent 75%, #cbd5e1 75%)`
                        : operation === 'remove-background' && bgType === 'custom-image' && customBgImageUrl
                        ? `url(${customBgImageUrl})`
                        : 'none',
                    backgroundSize: bgType === 'custom-image' ? 'cover' : '16px 16px',
                    backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0px',
                  }}
                >
                  <img
                    src={resultPreviewUrl}
                    alt="Enhanced After"
                    className="max-h-full max-w-full object-contain pointer-events-none transition-transform"
                    style={{
                      transform: operation === 'remove-background' ? `scale(${bgScale})` : undefined,
                      padding: operation === 'remove-background' ? `${bgPadding}px` : undefined,
                    }}
                  />
                </div>

                {/* Original Image (BEFORE) in Foreground clipped by slider */}
                <div
                  className="absolute inset-0 overflow-hidden pointer-events-none flex items-center justify-center p-2 bg-white"
                  style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}
                >
                  <img
                    src={originalPreviewUrl || ''}
                    alt="Original Before"
                    className="max-h-full max-w-full object-contain pointer-events-none"
                  />
                </div>

                {/* Vertical Divider Line */}
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-white shadow-[0_0_10px_rgba(0,0,0,0.5)] pointer-events-none z-10"
                  style={{ left: `${sliderPosition}%` }}
                >
                  <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-white text-slate-800 shadow-xl border border-slate-300 flex items-center justify-center text-xs font-bold">
                    ↔
                  </div>
                </div>

                {/* Draggable slider range input (works with mouse & touch) */}
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={sliderPosition}
                  onChange={(e) => setSliderPosition(Number(e.target.value))}
                  className="absolute inset-0 opacity-0 cursor-ew-resize w-full h-full z-20"
                  aria-label="Slide horizontally to compare Before and After"
                />

                {/* Badges */}
                <div className="absolute top-3 left-3 bg-black/70 backdrop-blur-xs text-white text-[11px] font-bold px-2.5 py-1 rounded-md pointer-events-none z-10">
                  BEFORE
                </div>
                <div className="absolute top-3 right-3 bg-blue-600/90 backdrop-blur-xs text-white text-[11px] font-bold px-2.5 py-1 rounded-md pointer-events-none z-10">
                  AFTER
                </div>
              </div>

              {/* Download Controls (Section 10) */}
              <div className="pt-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-xs font-semibold text-slate-700">Export format:</span>
                  <select
                    value={downloadFormat}
                    onChange={(e) =>
                      setDownloadFormat(e.target.value as 'png' | 'jpg' | 'webp' | 'avif')
                    }
                    className="px-3 py-1.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 bg-white"
                  >
                    <option value="png">PNG (Preserves alpha/transparency)</option>
                    <option value="webp">WebP (Modern high-compression)</option>
                    <option value="avif">AVIF (Next-gen)</option>
                    <option value="jpg">JPG (Standard photo)</option>
                  </select>

                  {/* JPG transparency warning (Section 10) */}
                  {downloadFormat === 'jpg' && (
                    <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg text-[11px] text-amber-800">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-600" />
                      <span>JPG does not support transparency.</span>
                      <label className="font-semibold ml-1">Fill color:</label>
                      <input
                        type="color"
                        value={jpgFillColor}
                        onChange={(e) => setJpgFillColor(e.target.value)}
                        className="w-5 h-5 rounded cursor-pointer border border-slate-300 p-0"
                      />
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleDownload}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-500/20 transition-all active:scale-[0.98]"
                >
                  <Download className="w-4 h-4" />
                  <span>Download result ({downloadFormat.toUpperCase()})</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  UploadCloud,
  Download,
  RefreshCw,
  Sliders,
  AlertTriangle,
  RotateCcw,
  Check,
  ImageIcon,
  Eye,
  Layers,
} from 'lucide-react';
import { backgroundRemovalService } from '../../services/ai/background-removal/service';
import { formatBytes } from '../../utils/file/format';
import { downloadBlob } from '../../utils/download/downloader';
import { getImageDimensions } from '../../utils/image/dimensions';
import { validateFileSize } from '../../utils/file/security';
import { BackgroundEditOptions, CanvasBackgroundType } from '../../types/ai';

export const BackgroundRemoverView: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [originalPreviewUrl, setOriginalPreviewUrl] = useState<string | null>(null);
  const [originalDimensions, setOriginalDimensions] = useState<{ width: number; height: number } | null>(null);

  const [isProcessing, setIsProcessing] = useState(false);
  const [progressStep, setProgressStep] = useState<string>('Analizando imagen...');
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);
  const [resultPreviewUrl, setResultPreviewUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [processingTimeMs, setProcessingTimeMs] = useState<number | null>(null);

  // Comparison mode
  const [viewMode, setViewMode] = useState<'split' | 'side-by-side'>('split');
  const [splitSlider, setSplitSlider] = useState<number>(50);

  // Post-removal editing options (Section 11)
  const [editOptions, setEditOptions] = useState<BackgroundEditOptions>({
    backgroundType: 'transparent',
    customColor: '#4f46e5',
    padding: 0,
    scale: 1,
    center: true,
    exportFormat: 'png',
    exportQuality: 90,
  });

  const [customBgImageFile, setCustomBgImageFile] = useState<File | null>(null);
  const [customBgImageUrl, setCustomBgImageUrl] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const bgImgInputRef = useRef<HTMLInputElement>(null);
  const compositeCanvasRef = useRef<HTMLCanvasElement>(null);

  // Cleanup object URLs on unmount or file change
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
      setErrorMessage(validation.error || 'Archivo no válido.');
      return;
    }

    setErrorMessage(null);
    setSelectedFile(file);
    setResultBlob(null);
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

  const handleProcessAi = async () => {
    if (!selectedFile) return;

    setIsProcessing(true);
    setErrorMessage(null);
    setProgressStep('Analizando imagen con Nano Banana IA...');

    const start = performance.now();
    try {
      // Update status steps for pleasant UX
      const timer = setTimeout(() => {
        setProgressStep('Segmentando sujeto en primer plano...');
      }, 1200);

      const blob = await backgroundRemovalService.removeBackground(selectedFile, {
        outputFormat: 'png',
      });

      clearTimeout(timer);
      const end = performance.now();
      setProcessingTimeMs(Math.round(end - start));
      setResultBlob(blob);

      if (resultPreviewUrl) URL.revokeObjectURL(resultPreviewUrl);
      const url = URL.createObjectURL(blob);
      setResultPreviewUrl(url);
    } catch (err: unknown) {
      console.error('Error removing background:', err);
      if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('No fue posible eliminar el fondo. Intenta con otra imagen.');
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCustomBgUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setCustomBgImageFile(file);
      if (customBgImageUrl) URL.revokeObjectURL(customBgImageUrl);
      const url = URL.createObjectURL(file);
      setCustomBgImageUrl(url);
      setEditOptions((prev) => ({ ...prev, backgroundType: 'custom-image' }));
    }
  };

  // Re-render composite canvas for preview & download
  const renderCompositeCanvas = async (): Promise<Blob | null> => {
    if (!resultPreviewUrl || !originalDimensions) return resultBlob;

    const width = originalDimensions.width;
    const height = originalDimensions.height;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return resultBlob;

    // 1. Draw Background
    if (editOptions.backgroundType === 'white') {
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, width, height);
    } else if (editOptions.backgroundType === 'black') {
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, width, height);
    } else if (editOptions.backgroundType === 'custom-color') {
      ctx.fillStyle = editOptions.customColor;
      ctx.fillRect(0, 0, width, height);
    } else if (editOptions.backgroundType === 'custom-image' && customBgImageUrl) {
      try {
        const bgImg = await loadImage(customBgImageUrl);
        ctx.drawImage(bgImg, 0, 0, width, height);
      } catch {
        // Fallback
      }
    }

    // 2. Draw Subject (with padding & scale)
    try {
      const subjectImg = await loadImage(resultPreviewUrl);
      const scale = editOptions.scale;
      const pad = editOptions.padding;

      const availW = Math.max(10, width - pad * 2);
      const availH = Math.max(10, height - pad * 2);

      const drawW = availW * scale;
      const drawH = availH * scale;

      const drawX = (width - drawW) / 2;
      const drawY = (height - drawH) / 2;

      ctx.drawImage(subjectImg, drawX, drawY, drawW, drawH);
    } catch (err) {
      console.error('Error drawing composite subject:', err);
    }

    // 3. Export format
    const format = editOptions.exportFormat;
    let mimeType = 'image/png';
    let quality = undefined;

    if (format === 'webp') {
      mimeType = 'image/webp';
      quality = editOptions.exportQuality / 100;
    } else if (format === 'jpg') {
      mimeType = 'image/jpeg';
      quality = editOptions.exportQuality / 100;
    }

    return new Promise((resolve) => {
      canvas.toBlob((blob) => resolve(blob), mimeType, quality);
    });
  };

  const loadImage = (src: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  };

  const handleDownloadResult = async () => {
    if (!resultBlob || !selectedFile) return;

    const baseName = selectedFile.name.substring(0, selectedFile.name.lastIndexOf('.')) || selectedFile.name;
    const finalBlob = await renderCompositeCanvas();
    if (!finalBlob) return;

    const filename = `${baseName}-sin-fondo.${editOptions.exportFormat}`;
    downloadBlob(finalBlob, filename);
  };

  const handleReset = () => {
    setSelectedFile(null);
    setResultBlob(null);
    if (originalPreviewUrl) URL.revokeObjectURL(originalPreviewUrl);
    if (resultPreviewUrl) URL.revokeObjectURL(resultPreviewUrl);
    setOriginalPreviewUrl(null);
    setResultPreviewUrl(null);
    setErrorMessage(null);
  };

  return (
    <div className="max-w-5xl mx-auto py-4">
      {/* Section Header */}
      <div className="text-center max-w-2xl mx-auto mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200/80 text-indigo-700 text-xs font-semibold mb-3">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Nano Banana AI Engine</span>
        </div>
        <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
          Elimina el fondo de cualquier imagen
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          Sube una imagen y deja que la IA elimine automáticamente el fondo con bordes limpios y transparentes.
        </p>
      </div>

      {/* Main State: No file selected -> Dropzone */}
      {!selectedFile && (
        <div className="max-w-2xl mx-auto">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/jpg"
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
            className="border-2 border-dashed border-slate-300 hover:border-indigo-400 bg-white hover:bg-slate-50/80 rounded-3xl p-10 sm:p-14 text-center cursor-pointer transition-all shadow-xs group outline-none focus:ring-4 focus:ring-indigo-100"
          >
            <div className="w-16 h-16 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
              <UploadCloud className="w-8 h-8" />
            </div>

            <h3 className="text-xl font-bold text-slate-900 mb-1">
              Arrastra una imagen o haz clic para subir
            </h3>
            <p className="text-xs text-slate-500 mb-6">
              Soporta retratos, productos, logotipos, mascotas y objetos (JPG, PNG, WebP)
            </p>

            <button
              type="button"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold shadow-xs hover:bg-indigo-700 pointer-events-none"
            >
              <Sparkles className="w-4 h-4" />
              <span>Seleccionar imagen</span>
            </button>
          </div>
        </div>
      )}

      {/* File selected, awaiting AI or showing results */}
      {selectedFile && (
        <div className="space-y-6">
          {/* Card Bar */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden shrink-0">
                {originalPreviewUrl && (
                  <img
                    src={originalPreviewUrl}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                )}
              </div>
              <div>
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
                      <span className="text-indigo-600 font-medium">
                        Procesado en {processingTimeMs} ms
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              {!resultBlob && !isProcessing && (
                <button
                  type="button"
                  onClick={handleProcessAi}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white text-sm font-semibold shadow-md shadow-indigo-500/20 transition-all active:scale-[0.98]"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Eliminar fondo con IA</span>
                </button>
              )}

              {resultBlob && (
                <button
                  type="button"
                  onClick={handleDownloadResult}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold shadow-md shadow-emerald-500/20 transition-all active:scale-[0.98]"
                >
                  <Download className="w-4 h-4" />
                  <span>Descargar resultado</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleReset}
                disabled={isProcessing}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-40"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Cambiar imagen</span>
              </button>
            </div>
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
                <span>{errorMessage}</span>
              </div>
              <button
                type="button"
                onClick={handleProcessAi}
                className="font-semibold underline hover:text-red-900"
              >
                Reintentar
              </button>
            </div>
          )}

          {/* Loading Processing State */}
          {isProcessing && (
            <div className="bg-white rounded-3xl border border-slate-200/90 p-12 text-center shadow-xs flex flex-col items-center justify-center min-h-[360px]">
              <div className="relative mb-6">
                <div className="w-16 h-16 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 animate-pulse">
                  <Sparkles className="w-8 h-8" />
                </div>
                <div className="absolute -inset-2 rounded-3xl border-2 border-indigo-500/30 animate-spin border-t-indigo-600" />
              </div>

              <h3 className="text-lg font-bold text-slate-900 mb-1">{progressStep}</h3>
              <p className="text-xs text-slate-500 max-w-sm">
                Procesando con la IA de Nano Banana. Manteniendo detalles de bordes y transparencia cristalina.
              </p>
            </div>
          )}

          {/* Result View with Before / After & Checkerboard Pattern */}
          {resultBlob && !isProcessing && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left 2 Cols: Preview area */}
              <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200/90 overflow-hidden shadow-xs flex flex-col">
                {/* Visual View Mode bar */}
                <div className="p-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-700">Vista previa:</span>
                    <button
                      type="button"
                      onClick={() => setViewMode('split')}
                      className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                        viewMode === 'split' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-600'
                      }`}
                    >
                      Divisor interactivo
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewMode('side-by-side')}
                      className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                        viewMode === 'side-by-side' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-600'
                      }`}
                    >
                      Lado a lado
                    </button>
                  </div>

                  <span className="text-[11px] text-slate-500 hidden sm:inline">
                    Patrón tipo damero (Checkerboard) para transparencia
                  </span>
                </div>

                {/* Canvas / Image Display */}
                <div className="flex-1 p-6 flex items-center justify-center min-h-[380px] bg-slate-100">
                  {viewMode === 'side-by-side' ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full h-full">
                      {/* Original */}
                      <div className="flex flex-col items-center bg-white rounded-2xl p-3 border border-slate-200">
                        <span className="text-xs font-semibold text-slate-500 mb-2">ANTES (Original)</span>
                        <div className="w-full flex-1 flex items-center justify-center rounded-xl bg-slate-50 overflow-hidden p-2">
                          <img
                            src={originalPreviewUrl || ''}
                            alt="Original"
                            className="max-h-[320px] w-auto object-contain rounded-lg"
                          />
                        </div>
                      </div>

                      {/* Cutout */}
                      <div className="flex flex-col items-center bg-white rounded-2xl p-3 border border-slate-200">
                        <span className="text-xs font-semibold text-indigo-600 mb-2">DESPUÉS (IA Cutout)</span>
                        <div
                          className="w-full flex-1 flex items-center justify-center rounded-xl overflow-hidden p-2 relative"
                          style={{
                            backgroundColor:
                              editOptions.backgroundType === 'white'
                                ? '#FFFFFF'
                                : editOptions.backgroundType === 'black'
                                ? '#000000'
                                : editOptions.backgroundType === 'custom-color'
                                ? editOptions.customColor
                                : 'transparent',
                            backgroundImage:
                              editOptions.backgroundType === 'transparent'
                                ? `linear-gradient(45deg, #e2e8f0 25%, transparent 25%),
                                   linear-gradient(-45deg, #e2e8f0 25%, transparent 25%),
                                   linear-gradient(45deg, transparent 75%, #e2e8f0 75%),
                                   linear-gradient(-45deg, transparent 75%, #e2e8f0 75%)`
                                : editOptions.backgroundType === 'custom-image' && customBgImageUrl
                                ? `url(${customBgImageUrl})`
                                : 'none',
                            backgroundSize: editOptions.backgroundType === 'custom-image' ? 'cover' : '16px 16px',
                            backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0px',
                          }}
                        >
                          <img
                            src={resultPreviewUrl || ''}
                            alt="Sin fondo"
                            className="max-h-[320px] w-auto object-contain transition-transform"
                            style={{
                              transform: `scale(${editOptions.scale})`,
                              padding: `${editOptions.padding}px`,
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* Interactive Split Slider */
                    <div
                      className="relative w-full max-w-xl max-h-[420px] flex items-center justify-center select-none overflow-hidden rounded-2xl border border-slate-300 shadow-sm"
                      style={{
                        backgroundColor:
                          editOptions.backgroundType === 'white'
                            ? '#FFFFFF'
                            : editOptions.backgroundType === 'black'
                            ? '#000000'
                            : editOptions.backgroundType === 'custom-color'
                            ? editOptions.customColor
                            : '#ffffff',
                        backgroundImage:
                          editOptions.backgroundType === 'transparent'
                            ? `linear-gradient(45deg, #cbd5e1 25%, transparent 25%),
                               linear-gradient(-45deg, #cbd5e1 25%, transparent 25%),
                               linear-gradient(45deg, transparent 75%, #cbd5e1 75%),
                               linear-gradient(-45deg, transparent 75%, #cbd5e1 75%)`
                            : editOptions.backgroundType === 'custom-image' && customBgImageUrl
                            ? `url(${customBgImageUrl})`
                            : 'none',
                        backgroundSize: editOptions.backgroundType === 'custom-image' ? 'cover' : '18px 18px',
                        backgroundPosition: '0 0, 0 9px, 9px -9px, -9px 0px',
                      }}
                    >
                      {/* Cutout image in background */}
                      <img
                        src={resultPreviewUrl || ''}
                        alt="Sin fondo"
                        className="max-h-[380px] w-full object-contain pointer-events-none"
                        style={{
                          transform: `scale(${editOptions.scale})`,
                          padding: `${editOptions.padding}px`,
                        }}
                      />

                      {/* Original image on top, clipped */}
                      <div
                        className="absolute inset-0 overflow-hidden pointer-events-none bg-white"
                        style={{ clipPath: `inset(0 ${100 - splitSlider}% 0 0)` }}
                      >
                        <img
                          src={originalPreviewUrl || ''}
                          alt="Original"
                          className="max-h-[380px] w-full h-full object-contain"
                        />
                      </div>

                      {/* Slider Line Divider */}
                      <div
                        className="absolute top-0 bottom-0 w-0.5 bg-white shadow-[0_0_8px_rgba(0,0,0,0.6)] pointer-events-none z-10"
                        style={{ left: `${splitSlider}%` }}
                      >
                        <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-white text-slate-800 shadow-lg border border-slate-300 flex items-center justify-center text-xs font-bold">
                          ↔
                        </div>
                      </div>

                      {/* Slider Range Input */}
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={splitSlider}
                        onChange={(e) => setSplitSlider(Number(e.target.value))}
                        className="absolute inset-0 opacity-0 cursor-ew-resize w-full h-full z-20"
                        aria-label="Deslizar para comparar antes y después"
                      />

                      {/* Labels */}
                      <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-xs text-white text-[11px] font-semibold px-2 py-0.5 rounded-md pointer-events-none">
                        ANTES
                      </div>
                      <div className="absolute top-3 right-3 bg-indigo-600/90 backdrop-blur-xs text-white text-[11px] font-semibold px-2 py-0.5 rounded-md pointer-events-none">
                        DESPUÉS
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Col: Post-Removal Editing Controls (Section 11) */}
              <div className="bg-white rounded-3xl border border-slate-200/90 p-5 shadow-xs flex flex-col justify-between space-y-5">
                <div>
                  <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                    <Sliders className="w-4 h-4 text-indigo-600" />
                    <h3 className="text-sm font-bold text-slate-900">Personalizar resultado</h3>
                  </div>

                  {/* 1. Fondo selector (Section 11) */}
                  <div className="mt-4">
                    <label className="block text-xs font-semibold text-slate-700 mb-2">
                      Fondo:
                    </label>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <button
                        type="button"
                        onClick={() => setEditOptions((prev) => ({ ...prev, backgroundType: 'transparent' }))}
                        className={`p-2 rounded-xl border text-center font-medium transition-all ${
                          editOptions.backgroundType === 'transparent'
                            ? 'border-indigo-600 bg-indigo-50/50 text-indigo-900 font-bold'
                            : 'border-slate-200 hover:border-slate-300 text-slate-700'
                        }`}
                      >
                        Transparente
                      </button>

                      <button
                        type="button"
                        onClick={() => setEditOptions((prev) => ({ ...prev, backgroundType: 'white' }))}
                        className={`p-2 rounded-xl border text-center font-medium transition-all ${
                          editOptions.backgroundType === 'white'
                            ? 'border-indigo-600 bg-indigo-50/50 text-indigo-900 font-bold'
                            : 'border-slate-200 hover:border-slate-300 text-slate-700'
                        }`}
                      >
                        Blanco
                      </button>

                      <button
                        type="button"
                        onClick={() => setEditOptions((prev) => ({ ...prev, backgroundType: 'black' }))}
                        className={`p-2 rounded-xl border text-center font-medium transition-all ${
                          editOptions.backgroundType === 'black'
                            ? 'border-indigo-600 bg-slate-900 text-white font-bold'
                            : 'border-slate-200 hover:border-slate-300 text-slate-700'
                        }`}
                      >
                        Negro
                      </button>

                      <button
                        type="button"
                        onClick={() => setEditOptions((prev) => ({ ...prev, backgroundType: 'custom-color' }))}
                        className={`p-2 rounded-xl border text-center font-medium transition-all ${
                          editOptions.backgroundType === 'custom-color'
                            ? 'border-indigo-600 bg-indigo-50/50 text-indigo-900 font-bold'
                            : 'border-slate-200 hover:border-slate-300 text-slate-700'
                        }`}
                      >
                        Color personalizado
                      </button>
                    </div>

                    {/* Color Picker if custom-color */}
                    {editOptions.backgroundType === 'custom-color' && (
                      <div className="mt-3 flex items-center gap-2 p-2 rounded-xl bg-slate-50 border border-slate-200">
                        <input
                          type="color"
                          value={editOptions.customColor}
                          onChange={(e) =>
                            setEditOptions((prev) => ({ ...prev, customColor: e.target.value }))
                          }
                          className="w-8 h-8 rounded-lg cursor-pointer border border-slate-300 p-0"
                        />
                        <span className="text-xs font-mono font-medium text-slate-700">
                          {editOptions.customColor.toUpperCase()}
                        </span>
                      </div>
                    )}

                    {/* Custom Background Image upload button */}
                    <div className="mt-2.5">
                      <input
                        ref={bgImgInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleCustomBgUpload}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => bgImgInputRef.current?.click()}
                        className="w-full inline-flex items-center justify-center gap-2 p-2 rounded-xl border border-slate-200 hover:border-slate-300 text-xs font-medium text-slate-700 bg-slate-50/60"
                      >
                        <ImageIcon className="w-3.5 h-3.5 text-indigo-600" />
                        <span>
                          {customBgImageFile ? customBgImageFile.name : 'Subir imagen de fondo'}
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* 2. Sujeto Controls (Padding, Scale) */}
                  <div className="mt-5 space-y-3 pt-4 border-t border-slate-100">
                    <div>
                      <div className="flex justify-between text-xs text-slate-600 mb-1">
                        <span className="font-medium">Escala del sujeto:</span>
                        <span className="font-bold text-slate-800">
                          {Math.round(editOptions.scale * 100)}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0.5"
                        max="1.5"
                        step="0.05"
                        value={editOptions.scale}
                        onChange={(e) =>
                          setEditOptions((prev) => ({
                            ...prev,
                            scale: parseFloat(e.target.value),
                          }))
                        }
                        className="w-full accent-indigo-600 cursor-pointer"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between text-xs text-slate-600 mb-1">
                        <span className="font-medium">Margen / Padding:</span>
                        <span className="font-bold text-slate-800">{editOptions.padding} px</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="80"
                        step="5"
                        value={editOptions.padding}
                        onChange={(e) =>
                          setEditOptions((prev) => ({
                            ...prev,
                            padding: parseInt(e.target.value, 10),
                          }))
                        }
                        className="w-full accent-indigo-600 cursor-pointer"
                      />
                    </div>
                  </div>

                  {/* 3. Export Format Selector (Section 10) */}
                  <div className="mt-5 pt-4 border-t border-slate-100">
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Descargar como:
                    </label>
                    <select
                      value={editOptions.exportFormat}
                      onChange={(e) =>
                        setEditOptions((prev) => ({
                          ...prev,
                          exportFormat: e.target.value as 'png' | 'webp' | 'jpg',
                        }))
                      }
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                    >
                      <option value="png">PNG transparente (Recomendado)</option>
                      <option value="webp">WebP con transparencia</option>
                      <option value="jpg">JPG (Sin transparencia)</option>
                    </select>

                    {/* Warning if JPG selected without solid background */}
                    {editOptions.exportFormat === 'jpg' && (
                      <div className="mt-2 p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-[11px] text-amber-800 flex items-start gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-600 mt-0.5" />
                        <span>
                          JPG no soporta transparencia. Se aplicará el color de fondo seleccionado (o blanco por defecto).
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Final Download Button */}
                <div className="pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={handleDownloadResult}
                    className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-500/25 transition-all active:scale-[0.98]"
                  >
                    <Download className="w-4 h-4" />
                    <span>Descargar {editOptions.exportFormat.toUpperCase()}</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

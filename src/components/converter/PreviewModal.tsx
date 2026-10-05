import React, { useState, useEffect } from 'react';
import { X, Download, ArrowRight, Check, Sliders } from 'lucide-react';
import { ImageFileItem } from '../../types/image';
import { formatBytes, calculateSizeReduction } from '../../utils/file/format';

interface PreviewModalProps {
  item: ImageFileItem | null;
  onClose: () => void;
  onDownload: (id: string) => void;
}

export const PreviewModal: React.FC<PreviewModalProps> = ({
  item,
  onClose,
  onDownload,
}) => {
  const [sliderPosition, setSliderPosition] = useState(50);
  const [viewMode, setViewMode] = useState<'split' | 'side-by-side'>('split');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!item || !item.convertedUrl) return null;

  const reduction =
    item.convertedSize
      ? calculateSizeReduction(item.originalSize, item.convertedSize)
      : null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="preview-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-fade-in"
    >
      <div className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
          <div>
            <h3 id="preview-modal-title" className="text-base font-bold text-slate-900 truncate max-w-md">
              Comparación: {item.name}
            </h3>
            <p className="text-xs text-slate-500">
              {item.originalFormat.toUpperCase()} → {item.options.targetFormat.toUpperCase()}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* View Mode Switcher */}
            <div className="flex bg-slate-200/80 p-0.5 rounded-lg text-xs">
              <button
                type="button"
                onClick={() => setViewMode('split')}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                  viewMode === 'split' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                }`}
              >
                Divisor interactivo
              </button>
              <button
                type="button"
                onClick={() => setViewMode('side-by-side')}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                  viewMode === 'side-by-side' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                }`}
              >
                Lado a lado
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              aria-label="Cerrar ventana modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Comparison Stats Bar (Section 6 requirements) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 px-6 py-3 bg-slate-50 border-b border-slate-200 text-center text-xs">
          <div>
            <span className="block text-slate-400 text-[11px] font-medium uppercase tracking-wider">
              Original
            </span>
            <span className="text-sm font-bold text-slate-800">
              {formatBytes(item.originalSize)}
            </span>
            {item.originalDimensions && (
              <span className="block text-[11px] text-slate-500">
                {item.originalDimensions.width} × {item.originalDimensions.height} px
              </span>
            )}
          </div>

          <div>
            <span className="block text-slate-400 text-[11px] font-medium uppercase tracking-wider">
              Convertida ({item.options.targetFormat.toUpperCase()})
            </span>
            <span className="text-sm font-bold text-slate-800">
              {item.convertedSize ? formatBytes(item.convertedSize) : '—'}
            </span>
            {item.convertedDimensions && (
              <span className="block text-[11px] text-slate-500">
                {item.convertedDimensions.width} × {item.convertedDimensions.height} px
              </span>
            )}
          </div>

          <div>
            <span className="block text-slate-400 text-[11px] font-medium uppercase tracking-wider">
              Reducción de peso
            </span>
            {reduction ? (
              <span
                className={`text-sm font-extrabold ${
                  reduction.isReduced ? 'text-emerald-600' : 'text-amber-600'
                }`}
              >
                {reduction.isReduced
                  ? `-${reduction.differencePercentage}%`
                  : `+${reduction.differencePercentage}%`}
              </span>
            ) : (
              <span className="text-sm text-slate-500">—</span>
            )}
            <span className="block text-[11px] text-slate-500">
              {reduction?.isReduced ? 'Optimizado' : 'Mismo rango'}
            </span>
          </div>

          <div>
            <span className="block text-slate-400 text-[11px] font-medium uppercase tracking-wider">
              Tiempo de proceso
            </span>
            <span className="text-sm font-bold text-slate-800">
              {item.processingTimeMs || 0} ms
            </span>
            <span className="block text-[11px] text-emerald-600 font-medium">
              100% en navegador
            </span>
          </div>
        </div>

        {/* Visual Comparison Area */}
        <div className="flex-1 p-6 overflow-auto flex items-center justify-center bg-slate-100/60 min-h-[340px]">
          {viewMode === 'side-by-side' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full h-full max-h-[55vh]">
              {/* Original */}
              <div className="flex flex-col items-center bg-white rounded-2xl p-3 border border-slate-200 shadow-xs">
                <span className="text-xs font-semibold text-slate-500 mb-2">Original</span>
                <div className="w-full flex-1 flex items-center justify-center overflow-hidden rounded-xl bg-slate-50">
                  <img
                    src={item.previewUrl}
                    alt="Original"
                    className="max-h-[45vh] w-auto object-contain rounded-lg"
                  />
                </div>
              </div>

              {/* Converted */}
              <div className="flex flex-col items-center bg-white rounded-2xl p-3 border border-slate-200 shadow-xs">
                <span className="text-xs font-semibold text-emerald-600 mb-2">
                  Convertida ({item.options.targetFormat.toUpperCase()})
                </span>
                <div className="w-full flex-1 flex items-center justify-center overflow-hidden rounded-xl bg-slate-50">
                  <img
                    src={item.convertedUrl}
                    alt="Convertida"
                    className="max-h-[45vh] w-auto object-contain rounded-lg"
                  />
                </div>
              </div>
            </div>
          ) : (
            /* Interactive Split Slider */
            <div className="relative w-full max-w-2xl max-h-[55vh] flex items-center justify-center select-none overflow-hidden rounded-2xl border border-slate-300 shadow-sm bg-white">
              {/* Converted image in background */}
              <img
                src={item.convertedUrl}
                alt="Convertida"
                className="max-h-[50vh] w-full object-contain pointer-events-none"
              />

              {/* Original image on top, clipped by slider */}
              <div
                className="absolute inset-0 overflow-hidden pointer-events-none"
                style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}
              >
                <img
                  src={item.previewUrl}
                  alt="Original"
                  className="max-h-[50vh] w-full h-full object-contain"
                />
              </div>

              {/* Slider Line Divider */}
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-white shadow-[0_0_8px_rgba(0,0,0,0.5)] pointer-events-none z-10"
                style={{ left: `${sliderPosition}%` }}
              >
                <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-white text-slate-800 shadow-lg border border-slate-300 flex items-center justify-center text-xs font-bold">
                  ↔
                </div>
              </div>

              {/* Hidden range input over entire image for smooth dragging */}
              <input
                type="range"
                min="0"
                max="100"
                value={sliderPosition}
                onChange={(e) => setSliderPosition(Number(e.target.value))}
                className="absolute inset-0 opacity-0 cursor-ew-resize w-full h-full z-20"
                aria-label="Deslizar para comparar original y convertida"
              />

              {/* Badges */}
              <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-xs text-white text-[11px] font-semibold px-2 py-0.5 rounded-md pointer-events-none">
                Original
              </div>
              <div className="absolute top-3 right-3 bg-blue-600/80 backdrop-blur-xs text-white text-[11px] font-semibold px-2 py-0.5 rounded-md pointer-events-none">
                {item.options.targetFormat.toUpperCase()}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-200 bg-white flex items-center justify-between">
          <p className="text-xs text-slate-500">
            Formato: <strong>{item.options.targetFormat.toUpperCase()}</strong> • Calidad:{' '}
            <strong>{item.options.quality}%</strong>
          </p>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
            >
              Cerrar
            </button>
            <button
              type="button"
              onClick={() => onDownload(item.id)}
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>Descargar imagen</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

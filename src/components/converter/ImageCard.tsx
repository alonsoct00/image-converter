import React, { useState } from 'react';
import {
  Download,
  Trash2,
  RefreshCw,
  Eye,
  Sliders,
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  ImageFileItem,
  SupportedOutputFormat,
} from '../../types/image';
import { formatBytes, calculateSizeReduction } from '../../utils/file/format';
import { getAvailableOutputFormats } from '../../services/image/formats';

interface ImageCardProps {
  item: ImageFileItem;
  onUpdateOptions: (id: string, options: Partial<ImageFileItem['options']>) => void;
  onConvert: (id: string) => void;
  onDownload: (id: string) => void;
  onRemove: (id: string) => void;
  onOpenPreview: (item: ImageFileItem) => void;
}

export const ImageCard: React.FC<ImageCardProps> = ({
  item,
  onUpdateOptions,
  onConvert,
  onDownload,
  onRemove,
  onOpenPreview,
}) => {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const availableFormats = getAvailableOutputFormats();

  const handleFormatChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newFormat = e.target.value as SupportedOutputFormat;
    onUpdateOptions(item.id, { targetFormat: newFormat });
  };

  const handleQualityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newQuality = parseInt(e.target.value, 10);
    onUpdateOptions(item.id, { quality: newQuality });
  };

  const reduction =
    item.status === 'success' && item.convertedSize
      ? calculateSizeReduction(item.originalSize, item.convertedSize)
      : null;

  const currentFormatConfig = availableFormats.find(
    (f) => f.format === item.options.targetFormat
  );

  return (
    <div
      className={`bg-white rounded-2xl border transition-all duration-200 overflow-hidden ${
        item.status === 'error'
          ? 'border-red-200 shadow-xs'
          : item.status === 'success'
          ? 'border-emerald-200 shadow-xs'
          : 'border-slate-200/90 hover:border-slate-300 shadow-xs hover:shadow-sm'
      }`}
    >
      <div className="p-4 sm:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        {/* Left: Thumbnail & Metadata */}
        <div className="flex items-center gap-3 sm:gap-4 w-full md:w-auto min-w-0">
          <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 shrink-0 flex items-center justify-center">
            {item.previewUrl ? (
              <img
                src={item.previewUrl}
                alt={item.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-xs font-semibold text-slate-400 uppercase">
                {item.originalFormat}
              </span>
            )}

            {/* Status Overlay Badge */}
            {item.status === 'success' && (
              <div className="absolute bottom-1 right-1 bg-emerald-500 text-white rounded-full p-0.5 shadow-sm">
                <CheckCircle2 className="w-3.5 h-3.5" />
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <h4
              className="text-sm font-semibold text-slate-900 truncate"
              title={item.name}
            >
              {item.name}
            </h4>

            <div className="flex flex-wrap items-center gap-1.5 mt-1 text-xs text-slate-500">
              <span className="uppercase font-semibold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200/60">
                {item.originalFormat}
              </span>
              <span>•</span>
              {item.originalDimensions && (
                <>
                  <span>
                    {item.originalDimensions.width} × {item.originalDimensions.height}
                  </span>
                  <span>•</span>
                </>
              )}
              <span>{formatBytes(item.originalSize)}</span>
            </div>

            {/* Converted Stats pill if success */}
            {item.status === 'success' && item.convertedSize && (
              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/80">
                  {item.options.targetFormat.toUpperCase()} • {formatBytes(item.convertedSize)}
                </span>
                {reduction && reduction.differencePercentage > 0 && (
                  <span
                    className={`text-xs font-semibold ${
                      reduction.isReduced ? 'text-emerald-600' : 'text-amber-600'
                    }`}
                  >
                    {reduction.isReduced
                      ? `-${reduction.differencePercentage}%`
                      : `+${reduction.differencePercentage}%`}
                  </span>
                )}
                {item.processingTimeMs && (
                  <span className="text-[11px] text-slate-400">
                    ({item.processingTimeMs} ms)
                  </span>
                )}
              </div>
            )}

            {/* Error display */}
            {item.status === 'error' && (
              <div className="flex items-center gap-1.5 mt-2 text-xs text-red-600">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{item.errorMessage || 'No fue posible procesar esta imagen.'}</span>
              </div>
            )}
          </div>
        </div>

        {/* Right: Format Selector & Action Controls */}
        <div className="flex flex-wrap md:flex-nowrap items-center gap-2.5 w-full md:w-auto justify-between md:justify-end border-t md:border-t-0 pt-3 md:pt-0 border-slate-100">
          {/* Target Format Dropdown */}
          <div className="flex items-center gap-1.5">
            <label
              htmlFor={`format-${item.id}`}
              className="text-xs font-medium text-slate-600 whitespace-nowrap"
            >
              Convertir a:
            </label>
            <select
              id={`format-${item.id}`}
              value={item.options.targetFormat}
              onChange={handleFormatChange}
              disabled={item.status === 'processing'}
              className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 cursor-pointer disabled:opacity-50"
            >
              {availableFormats.map((f) => (
                <option key={f.format} value={f.format} disabled={!f.isSupported}>
                  {f.label} {!f.isSupported ? '(No compatible)' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Quick Quality Control if supported */}
          {currentFormatConfig?.hasQualityControl && (
            <div className="hidden sm:flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded-lg border border-slate-200">
              <span className="text-[11px] font-medium text-slate-500">Calidad:</span>
              <span className="text-xs font-semibold text-slate-700 w-6 text-right">
                {item.options.quality}
              </span>
              <input
                type="range"
                min="10"
                max="100"
                step="5"
                value={item.options.quality}
                onChange={handleQualityChange}
                disabled={item.status === 'processing'}
                className="w-16 accent-blue-600 cursor-pointer"
                title={`Calidad de compresión: ${item.options.quality}%`}
              />
            </div>
          )}

          {/* Advanced options toggle */}
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
            title="Opciones avanzadas"
            aria-label="Opciones avanzadas del formato"
          >
            <Sliders className="w-4 h-4" />
          </button>

          {/* Convert or Download Action */}
          {item.status === 'success' ? (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => onOpenPreview(item)}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium transition-colors"
                title="Ver comparativa antes y después"
              >
                <Eye className="w-3.5 h-3.5 text-slate-600" />
                <span className="hidden sm:inline">Comparar</span>
              </button>

              <button
                type="button"
                onClick={() => onDownload(item.id)}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium shadow-xs transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Descargar</span>
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => onConvert(item.id)}
              disabled={item.status === 'processing'}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-xs font-medium shadow-xs transition-colors"
            >
              {item.status === 'processing' ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Procesando...</span>
                </>
              ) : (
                <>
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>{item.status === 'error' ? 'Reintentar' : 'Convertir'}</span>
                </>
              )}
            </button>
          )}

          {/* Delete Button */}
          <button
            type="button"
            onClick={() => onRemove(item.id)}
            disabled={item.status === 'processing'}
            className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-40"
            title="Eliminar archivo de la lista"
            aria-label="Eliminar archivo"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Advanced / Specific Format Options Drawer */}
      {showAdvanced && (
        <div className="px-5 py-3.5 bg-slate-50/80 border-t border-slate-200/80 text-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-700">
              Opciones específicas para {item.options.targetFormat.toUpperCase()}
            </span>
            <button
              type="button"
              onClick={() => setShowAdvanced(false)}
              className="text-slate-400 hover:text-slate-600"
            >
              <ChevronUp className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {/* Quality Slider (Mobile & Detailed) */}
            {currentFormatConfig?.hasQualityControl && (
              <div>
                <label className="block text-slate-600 mb-1 font-medium">
                  Calidad de salida: <span className="font-bold text-slate-800">{item.options.quality}%</span>
                </label>
                <input
                  type="range"
                  min="1"
                  max="100"
                  value={item.options.quality}
                  onChange={handleQualityChange}
                  className="w-full accent-blue-600 cursor-pointer"
                />
              </div>
            )}

            {/* Transparency Fill Color for JPG/BMP */}
            {(item.options.targetFormat === 'jpg' || item.options.targetFormat === 'bmp') && (
              <div>
                <label className="block text-slate-600 mb-1 font-medium">
                  Fondo para transparencias:
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onUpdateOptions(item.id, { transparencyFill: '#FFFFFF' })}
                    className={`px-2 py-1 rounded border text-[11px] font-medium transition-colors ${
                      item.options.transparencyFill === '#FFFFFF'
                        ? 'border-blue-600 bg-white text-blue-700 font-bold ring-1 ring-blue-600'
                        : 'border-slate-300 bg-white text-slate-700'
                    }`}
                  >
                    Blanco
                  </button>
                  <button
                    type="button"
                    onClick={() => onUpdateOptions(item.id, { transparencyFill: '#000000' })}
                    className={`px-2 py-1 rounded border text-[11px] font-medium transition-colors ${
                      item.options.transparencyFill === '#000000'
                        ? 'border-blue-600 bg-slate-900 text-white font-bold ring-1 ring-blue-600'
                        : 'border-slate-300 bg-slate-800 text-white'
                    }`}
                  >
                    Negro
                  </button>
                  <input
                    type="color"
                    value={item.options.transparencyFill}
                    onChange={(e) => onUpdateOptions(item.id, { transparencyFill: e.target.value })}
                    className="w-7 h-6 rounded cursor-pointer border border-slate-300 p-0"
                    title="Color de fondo personalizado"
                  />
                </div>
              </div>
            )}

            {/* Lossless Toggle for WebP / AVIF */}
            {(item.options.targetFormat === 'webp' || item.options.targetFormat === 'avif') && (
              <div className="flex items-center gap-2 pt-2 sm:pt-4">
                <input
                  type="checkbox"
                  id={`lossless-${item.id}`}
                  checked={item.options.lossless}
                  onChange={(e) => onUpdateOptions(item.id, { lossless: e.target.checked })}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor={`lossless-${item.id}`} className="text-slate-700 cursor-pointer">
                  Modo Lossless (sin pérdida)
                </label>
              </div>
            )}

            {/* SVG Scale multiplier */}
            {item.originalFormat === 'svg' && (
              <div>
                <label className="block text-slate-600 mb-1 font-medium">
                  Escala de rasterizado SVG:
                </label>
                <select
                  value={item.options.svgScale}
                  onChange={(e) => onUpdateOptions(item.id, { svgScale: parseFloat(e.target.value) })}
                  className="px-2 py-1 rounded border border-slate-300 bg-white text-slate-800"
                >
                  <option value={1}>1x (Original)</option>
                  <option value={2}>2x (Alta resolución @2x)</option>
                  <option value={3}>3x (Ultra @3x)</option>
                  <option value={4}>4x (Impresión @4x)</option>
                </select>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

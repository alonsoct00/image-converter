import React from 'react';
import {
  RefreshCw,
  Archive,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Layers,
} from 'lucide-react';
import { ImageFileItem, SupportedOutputFormat } from '../../types/image';
import { formatBytes } from '../../utils/file/format';
import { getAvailableOutputFormats } from '../../services/image/formats';

interface BatchControlsProps {
  items: ImageFileItem[];
  globalFormat: SupportedOutputFormat;
  onGlobalFormatChange: (format: SupportedOutputFormat) => void;
  onConvertAll: () => void;
  onDownloadAllZip: () => void;
  onClearAll: () => void;
  isProcessingBatch: boolean;
}

export const BatchControls: React.FC<BatchControlsProps> = ({
  items,
  globalFormat,
  onGlobalFormatChange,
  onConvertAll,
  onDownloadAllZip,
  onClearAll,
  isProcessingBatch,
}) => {
  const availableFormats = getAvailableOutputFormats();
  const totalCount = items.length;
  const processedCount = items.filter((i) => i.status === 'success').length;
  const errorCount = items.filter((i) => i.status === 'error').length;
  const pendingCount = items.filter((i) => i.status === 'idle').length;

  const totalOriginalSize = items.reduce((acc, i) => acc + i.originalSize, 0);
  const totalConvertedSize = items.reduce((acc, i) => acc + (i.convertedSize || 0), 0);

  const hasConvertedAny = processedCount > 0;
  const isAllConverted = processedCount === totalCount && totalCount > 0;

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-xs mb-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Left: Summary and Progress Status */}
        <div className="flex flex-wrap items-center gap-3 sm:gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs">
              {totalCount}
            </div>
            <span className="text-sm font-semibold text-slate-800">
              {totalCount === 1 ? '1 imagen seleccionada' : `${totalCount} imágenes seleccionadas`}
            </span>
          </div>

          <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500">
            <span>•</span>
            <span>Total original: {formatBytes(totalOriginalSize)}</span>
            {hasConvertedAny && (
              <>
                <span>•</span>
                <span className="text-emerald-700 font-medium">
                  Convertido: {formatBytes(totalConvertedSize)}
                </span>
              </>
            )}
          </div>

          {/* Progress Indicator */}
          {processedCount > 0 && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 text-xs font-medium text-slate-700">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>
                {processedCount} / {totalCount} procesadas
              </span>
            </div>
          )}

          {errorCount > 0 && (
            <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-50 text-xs font-medium text-red-600 border border-red-100">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>{errorCount} con error</span>
            </div>
          )}
        </div>

        {/* Right: Batch Actions */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Global Format Selector */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200/80 rounded-xl px-2.5 py-1.5">
            <span className="text-xs text-slate-500 font-medium hidden sm:inline">
              Formato global:
            </span>
            <select
              value={globalFormat}
              onChange={(e) => onGlobalFormatChange(e.target.value as SupportedOutputFormat)}
              disabled={isProcessingBatch}
              className="bg-transparent text-xs font-bold text-slate-800 focus:outline-none cursor-pointer"
            >
              {availableFormats.map((f) => (
                <option key={f.format} value={f.format} disabled={!f.isSupported}>
                  {f.label} {!f.isSupported ? '(No compatible)' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Convert All Button */}
          <button
            type="button"
            onClick={onConvertAll}
            disabled={isProcessingBatch || pendingCount === 0 && !errorCount}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 text-white text-xs font-semibold shadow-xs transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isProcessingBatch ? 'animate-spin' : ''}`} />
            <span>
              {isProcessingBatch
                ? 'Procesando lote...'
                : pendingCount === 0 && processedCount > 0
                ? 'Reconvertir todas'
                : 'Convertir todas'}
            </span>
          </button>

          {/* Download ZIP Button */}
          {hasConvertedAny && (
            <button
              type="button"
              onClick={onDownloadAllZip}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition-colors"
            >
              <Archive className="w-3.5 h-3.5" />
              <span>Descargar todas (ZIP)</span>
            </button>
          )}

          {/* Clear List Button */}
          <button
            type="button"
            onClick={onClearAll}
            disabled={isProcessingBatch}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-40"
            title="Limpiar toda la lista"
            aria-label="Limpiar toda la lista"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Visual Progress Bar when batch processing */}
      {isProcessingBatch && (
        <div className="mt-4 pt-3 border-t border-slate-100">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5 font-medium">
            <span>Progreso del lote</span>
            <span>{Math.round((processedCount / totalCount) * 100)}%</span>
          </div>
          <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-600 rounded-full transition-all duration-300"
              style={{ width: `${(processedCount / totalCount) * 100}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

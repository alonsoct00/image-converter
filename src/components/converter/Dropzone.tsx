import React, { useRef, useState } from 'react';
import { UploadCloud, Image as ImageIcon, AlertCircle } from 'lucide-react';
import { validateFileSize } from '../../utils/file/security';

interface DropzoneProps {
  onFilesSelected: (files: File[]) => void;
  disabled?: boolean;
}

export const Dropzone: React.FC<DropzoneProps> = ({ onFilesSelected, disabled = false }) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [warningMessage, setWarningMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (disabled) return;
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    if (disabled) return;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processSelectedFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processSelectedFiles(Array.from(e.target.files));
      // Reset input value so same files can be chosen again if needed
      e.target.value = '';
    }
  };

  const processSelectedFiles = (rawFiles: File[]) => {
    setWarningMessage(null);
    const validFiles: File[] = [];
    const oversizedFiles: string[] = [];

    rawFiles.forEach((file) => {
      const validation = validateFileSize(file);
      if (validation.valid) {
        validFiles.push(file);
      } else {
        oversizedFiles.push(file.name);
      }
    });

    if (oversizedFiles.length > 0) {
      setWarningMessage(
        `${oversizedFiles.length} archivo(s) superaron el límite de 50 MB y fueron omitidos.`
      );
    }

    if (validFiles.length > 0) {
      onFilesSelected(validFiles);
    }
  };

  const handleClick = () => {
    if (disabled) return;
    fileInputRef.current?.click();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
  };

  return (
    <div className="w-full">
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".jpg,.jpeg,.png,.webp,.avif,.tiff,.tif,.bmp,.gif,.heic,.heif,.svg,image/*"
        onChange={handleFileInputChange}
        className="hidden"
        disabled={disabled}
      />

      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative group cursor-pointer border-2 border-dashed rounded-3xl p-8 sm:p-12 text-center transition-all outline-none focus:ring-4 focus:ring-blue-100 ${
          isDragOver
            ? 'border-blue-600 bg-blue-50/80 scale-[1.01]'
            : 'border-slate-300 hover:border-blue-400 bg-white hover:bg-slate-50/70 shadow-xs'
        } ${disabled ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''}`}
        aria-label="Área para arrastrar y soltar imágenes o seleccionar desde tu equipo"
      >
        <div className="max-w-md mx-auto flex flex-col items-center">
          <div
            className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110 mb-4 shadow-inner ${
              isDragOver ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-600 border border-blue-100'
            }`}
          >
            <UploadCloud className="w-8 h-8" />
          </div>

          <h3 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight mb-2">
            Arrastra tus imágenes aquí
          </h3>

          <p className="text-sm font-medium text-slate-500 mb-6">
            JPG, PNG, WebP, TIFF, HEIC, AVIF, BMP, GIF y más
          </p>

          <button
            type="button"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold shadow-sm hover:bg-blue-700 transition-colors pointer-events-none"
          >
            <ImageIcon className="w-4 h-4" />
            <span>Seleccionar imágenes</span>
          </button>

          <div className="mt-5 flex items-center gap-3 text-xs text-slate-400">
            <span>Máximo 50 MB por imagen</span>
            <span>•</span>
            <span>Múltiples archivos permitidos</span>
          </div>
        </div>
      </div>

      {warningMessage && (
        <div className="mt-3 flex items-center gap-2 p-3 text-xs rounded-xl bg-amber-50 text-amber-800 border border-amber-200">
          <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
          <span>{warningMessage}</span>
        </div>
      )}
    </div>
  );
};

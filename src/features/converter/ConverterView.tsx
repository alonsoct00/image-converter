import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  ImageFileItem,
  SupportedOutputFormat,
  ConversionOptions,
} from '../../types/image';
import { Dropzone } from '../../components/converter/Dropzone';
import { ImageCard } from '../../components/converter/ImageCard';
import { BatchControls } from '../../components/converter/BatchControls';
import { PreviewModal } from '../../components/converter/PreviewModal';
import { PrivacyNotice } from '../../components/common/PrivacyNotice';
import { convertImageFile } from '../../services/image/converter';
import {
  detectFormatFromFileNameOrMime,
  replaceFileExtension,
} from '../../utils/file/format';
import { getImageDimensions } from '../../utils/image/dimensions';
import { downloadBlob, downloadZip } from '../../utils/download/downloader';
import { getFormatCapability } from '../../services/image/formats';

export const ConverterView: React.FC = () => {
  const [items, setItems] = useState<ImageFileItem[]>([]);
  const [globalFormat, setGlobalFormat] = useState<SupportedOutputFormat>('webp');
  const [isProcessingBatch, setIsProcessingBatch] = useState(false);
  const [previewModalItem, setPreviewModalItem] = useState<ImageFileItem | null>(null);

  // Keep track of active Object URLs to revoke them safely
  const objectUrlsRef = useRef<Set<string>>(new Set());

  const registerUrl = useCallback((url: string) => {
    objectUrlsRef.current.add(url);
    return url;
  }, []);

  const revokeUrl = useCallback((url?: string) => {
    if (url && objectUrlsRef.current.has(url)) {
      URL.revokeObjectURL(url);
      objectUrlsRef.current.delete(url);
    }
  }, []);

  useEffect(() => {
    return () => {
      // Cleanup all object URLs when unmounting
      objectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
      objectUrlsRef.current.clear();
    };
  }, []);

  const handleFilesAdded = async (newFiles: File[]) => {
    const newItems: ImageFileItem[] = [];

    for (const file of newFiles) {
      const originalFormat = detectFormatFromFileNameOrMime(file);
      const id = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      const previewUrl = registerUrl(URL.createObjectURL(file));

      const formatConfig = getFormatCapability(globalFormat);

      const defaultOptions: ConversionOptions = {
        targetFormat: globalFormat,
        quality: formatConfig.defaultQuality,
        transparencyFill: '#FFFFFF',
        maintainTransparency: true,
        lossless: false,
        svgScale: 1,
      };

      const item: ImageFileItem = {
        id,
        file,
        name: file.name,
        originalFormat,
        originalSize: file.size,
        previewUrl,
        options: defaultOptions,
        status: 'idle',
        progress: 0,
      };

      // Extract dimensions asynchronously
      getImageDimensions(file)
        .then((dims) => {
          setItems((prev) =>
            prev.map((it) => (it.id === id ? { ...it, originalDimensions: dims } : it))
          );
        })
        .catch(() => {});

      newItems.push(item);
    }

    setItems((prev) => [...prev, ...newItems]);
  };

  const handleUpdateOptions = (
    id: string,
    optionsUpdate: Partial<ConversionOptions>
  ) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        return {
          ...item,
          options: {
            ...item.options,
            ...optionsUpdate,
          },
          // If already converted, reset to idle so user knows to re-convert with new options
          status: item.status === 'success' ? 'idle' : item.status,
        };
      })
    );
  };

  const handleGlobalFormatChange = (format: SupportedOutputFormat) => {
    setGlobalFormat(format);
    const formatConfig = getFormatCapability(format);
    setItems((prev) =>
      prev.map((item) => ({
        ...item,
        options: {
          ...item.options,
          targetFormat: format,
          quality: formatConfig.defaultQuality,
        },
        status: item.status === 'success' ? 'idle' : item.status,
      }))
    );
  };

  const handleConvertSingle = async (id: string) => {
    const item = items.find((i) => i.id === id);
    if (!item) return;

    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, status: 'processing', progress: 50, errorMessage: undefined } : i))
    );

    try {
      const result = await convertImageFile(item.file, item.options);
      if (item.convertedUrl) {
        revokeUrl(item.convertedUrl);
      }
      const convertedUrl = registerUrl(URL.createObjectURL(result.blob));

      setItems((prev) =>
        prev.map((i) =>
          i.id === id
            ? {
                ...i,
                status: 'success',
                progress: 100,
                convertedBlob: result.blob,
                convertedUrl,
                convertedSize: result.blob.size,
                convertedDimensions: {
                  width: result.width,
                  height: result.height,
                },
                processingTimeMs: result.processingTimeMs,
              }
            : i
        )
      );
    } catch (err: unknown) {
      console.error(`Conversion error for ${item.name}:`, err);
      const message =
        err instanceof Error
          ? err.message
          : 'No fue posible procesar esta imagen. Intenta con otro archivo.';
      setItems((prev) =>
        prev.map((i) =>
          i.id === id
            ? {
                ...i,
                status: 'error',
                errorMessage: message,
              }
            : i
        )
      );
    }
  };

  const handleConvertAll = async () => {
    if (isProcessingBatch || items.length === 0) return;
    setIsProcessingBatch(true);

    const pending = items.filter((i) => i.status !== 'success');
    for (const item of pending) {
      await handleConvertSingle(item.id);
    }

    setIsProcessingBatch(false);
  };

  const handleDownloadSingle = (id: string) => {
    const item = items.find((i) => i.id === id);
    if (!item || !item.convertedBlob) return;

    const newFilename = replaceFileExtension(
      item.name,
      item.options.targetFormat
    );
    downloadBlob(item.convertedBlob, newFilename);
  };

  const handleDownloadAllZip = async () => {
    const convertedItems = items.filter(
      (i) => i.status === 'success' && i.convertedBlob
    );
    if (convertedItems.length === 0) return;

    const filesToZip = convertedItems.map((item) => ({
      name: replaceFileExtension(item.name, item.options.targetFormat),
      blob: item.convertedBlob!,
    }));

    await downloadZip(filesToZip, 'imagenes_convertidas.zip');
  };

  const handleRemoveItem = (id: string) => {
    const item = items.find((i) => i.id === id);
    if (item) {
      revokeUrl(item.previewUrl);
      revokeUrl(item.convertedUrl);
    }
    setItems((prev) => prev.filter((i) => i.id !== id));
    if (previewModalItem?.id === id) {
      setPreviewModalItem(null);
    }
  };

  const handleClearAll = () => {
    items.forEach((item) => {
      revokeUrl(item.previewUrl);
      revokeUrl(item.convertedUrl);
    });
    setItems([]);
    setPreviewModalItem(null);
  };

  return (
    <div className="max-w-5xl mx-auto py-2">
      {/* Upload Dropzone */}
      <div className="mb-6">
        <Dropzone onFilesSelected={handleFilesAdded} disabled={isProcessingBatch} />
      </div>

      {/* Batch Controls (shown when files are present) */}
      {items.length > 0 && (
        <BatchControls
          items={items}
          globalFormat={globalFormat}
          onGlobalFormatChange={handleGlobalFormatChange}
          onConvertAll={handleConvertAll}
          onDownloadAllZip={handleDownloadAllZip}
          onClearAll={handleClearAll}
          isProcessingBatch={isProcessingBatch}
        />
      )}

      {/* Files List */}
      {items.length > 0 && (
        <div className="space-y-3 mb-8">
          {items.map((item) => (
            <ImageCard
              key={item.id}
              item={item}
              onUpdateOptions={handleUpdateOptions}
              onConvert={handleConvertSingle}
              onDownload={handleDownloadSingle}
              onRemove={handleRemoveItem}
              onOpenPreview={(it) => setPreviewModalItem(it)}
            />
          ))}
        </div>
      )}

      {/* Privacy Notice Card */}
      <PrivacyNotice />

      {/* Before / After Preview Modal */}
      {previewModalItem && (
        <PreviewModal
          item={previewModalItem}
          onClose={() => setPreviewModalItem(null)}
          onDownload={handleDownloadSingle}
        />
      )}
    </div>
  );
};

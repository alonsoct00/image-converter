import JSZip from 'jszip';
import { getSanitizedFilename } from '../file/format';

export function downloadBlob(blob: Blob, filename: string): void {
  const safeName = getSanitizedFilename(filename);
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = safeName;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function downloadZip(
  items: Array<{ name: string; blob: Blob }>,
  zipName: string = 'imagenes_convertidas.zip'
): Promise<void> {
  if (items.length === 0) return;

  const zip = new JSZip();
  const usedNames = new Set<string>();

  items.forEach((item, index) => {
    let base = item.name.trim();
    if (!base) base = `imagen_${index + 1}`;

    let finalName = base;
    let counter = 1;
    while (usedNames.has(finalName)) {
      const dotIndex = base.lastIndexOf('.');
      if (dotIndex !== -1) {
        finalName = `${base.substring(0, dotIndex)} (${counter})${base.substring(dotIndex)}`;
      } else {
        finalName = `${base} (${counter})`;
      }
      counter++;
    }
    usedNames.add(finalName);
    zip.file(finalName, item.blob);
  });

  const content = await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });

  downloadBlob(content, zipName);
}

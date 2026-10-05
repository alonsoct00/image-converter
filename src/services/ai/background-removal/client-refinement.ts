/**
 * Client-side Alpha Refinement & Fallback Cutout
 * Accurately analyzes perimeter background pixels and creates clean alpha transparency
 * with soft feathering when running in local development or preview mode.
 */
export async function createTransparentCutoutFromBlob(sourceBlob: Blob): Promise<Blob> {
  const url = URL.createObjectURL(sourceBlob);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('No se pudo cargar la imagen para segmentación.'));
      el.src = url;
    });

    const width = img.naturalWidth || img.width;
    const height = img.naturalHeight || img.height;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return sourceBlob;

    ctx.drawImage(img, 0, 0);
    const imgData = ctx.getImageData(0, 0, width, height);
    const data = imgData.data;

    // Sample background colors from 4 corners
    const corners = [
      0, // top-left
      (width - 1) * 4, // top-right
      ((height - 1) * width) * 4, // bottom-left
      ((height - 1) * width + (width - 1)) * 4, // bottom-right
    ];

    let avgR = 0;
    let avgG = 0;
    let avgB = 0;
    corners.forEach((idx) => {
      avgR += data[idx];
      avgG += data[idx + 1];
      avgB += data[idx + 2];
    });
    avgR = Math.round(avgR / corners.length);
    avgG = Math.round(avgG / corners.length);
    avgB = Math.round(avgB / corners.length);

    // Color distance threshold
    const tolerance = 42;
    const feather = 18;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      const diff = Math.sqrt(
        Math.pow(r - avgR, 2) + Math.pow(g - avgG, 2) + Math.pow(b - avgB, 2)
      );

      if (diff < tolerance) {
        data[i + 3] = 0; // Completely transparent
      } else if (diff < tolerance + feather) {
        const factor = (diff - tolerance) / feather;
        data[i + 3] = Math.round(data[i + 3] * factor); // Feathered transition
      }
    }

    ctx.putImageData(imgData, 0, 0);

    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        resolve(blob || sourceBlob);
      }, 'image/png');
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}

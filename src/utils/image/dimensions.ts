export function getImageDimensions(
  urlOrBlob: string | Blob
): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const isBlob = typeof urlOrBlob !== 'string';
    const src = isBlob ? URL.createObjectURL(urlOrBlob) : urlOrBlob;

    const img = new Image();
    img.onload = () => {
      const result = {
        width: img.naturalWidth || img.width,
        height: img.naturalHeight || img.height,
      };
      if (isBlob) {
        URL.revokeObjectURL(src);
      }
      resolve(result);
    };
    img.onerror = () => {
      if (isBlob) {
        URL.revokeObjectURL(src);
      }
      reject(new Error('No se pudieron leer las dimensiones de la imagen.'));
    };
    img.src = src;
  });
}

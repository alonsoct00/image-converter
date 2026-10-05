/**
 * Pure TypeScript BMP Encoder
 * Encodes Canvas ImageData into standard 24-bit or 32-bit BMP ArrayBuffer/Blob
 */
export function encodeBmp(imageData: ImageData, withAlpha: boolean = false): Blob {
  const width = imageData.width;
  const height = imageData.height;
  const data = imageData.data;

  // 24-bit BMP requires rows to be padded to multiples of 4 bytes
  const bytesPerPixel = withAlpha ? 4 : 3;
  const rowSize = Math.floor((bytesPerPixel * width + 3) / 4) * 4;
  const pixelArraySize = rowSize * height;
  const fileHeaderSize = 14;
  const infoHeaderSize = 40;
  const fileSize = fileHeaderSize + infoHeaderSize + pixelArraySize;

  const buffer = new ArrayBuffer(fileSize);
  const view = new DataView(buffer);

  // --- BMP File Header (14 bytes) ---
  // Signature 'BM'
  view.setUint8(0, 0x42);
  view.setUint8(1, 0x4d);
  // File size
  view.setUint32(2, fileSize, true);
  // Reserved
  view.setUint16(6, 0, true);
  view.setUint16(8, 0, true);
  // Offset to pixel data
  view.setUint32(10, fileHeaderSize + infoHeaderSize, true);

  // --- DIB / Info Header (BITMAPINFOHEADER - 40 bytes) ---
  view.setUint32(14, infoHeaderSize, true);
  view.setInt32(18, width, true);
  view.setInt32(22, height, true); // Bottom-up bitmap
  view.setUint16(26, 1, true); // Planes
  view.setUint16(28, withAlpha ? 32 : 24, true); // Bit count
  view.setUint32(30, 0, true); // Compression (BI_RGB = 0)
  view.setUint32(34, pixelArraySize, true); // Image size
  view.setInt32(38, 2835, true); // X pixels per meter (72 DPI)
  view.setInt32(42, 2835, true); // Y pixels per meter
  view.setUint32(46, 0, true); // Colors in color table
  view.setUint32(50, 0, true); // Important color count

  // --- Pixel Array (Bottom-up, BGR or BGRA) ---
  let offset = fileHeaderSize + infoHeaderSize;
  const paddingBytes = rowSize - width * bytesPerPixel;

  for (let y = height - 1; y >= 0; y--) {
    for (let x = 0; x < width; x++) {
      const srcIndex = (y * width + x) * 4;
      const r = data[srcIndex];
      const g = data[srcIndex + 1];
      const b = data[srcIndex + 2];
      const a = data[srcIndex + 3];

      // BMP stores colors in BGR(A) order
      view.setUint8(offset++, b);
      view.setUint8(offset++, g);
      view.setUint8(offset++, r);
      if (withAlpha) {
        view.setUint8(offset++, a);
      }
    }
    // Row padding
    for (let p = 0; p < paddingBytes; p++) {
      view.setUint8(offset++, 0);
    }
  }

  return new Blob([buffer], { type: 'image/bmp' });
}

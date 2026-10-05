export const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB

export const SUPPORTED_EXTENSIONS = [
  'jpg',
  'jpeg',
  'png',
  'webp',
  'avif',
  'tiff',
  'tif',
  'bmp',
  'gif',
  'heic',
  'heif',
  'svg',
];

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

export function validateFileSize(file: File): ValidationResult {
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return {
      valid: false,
      error: `El archivo supera el límite de 50 MB (tamaño actual: ${(file.size / (1024 * 1024)).toFixed(1)} MB).`,
    };
  }
  if (file.size === 0) {
    return {
      valid: false,
      error: 'El archivo está vacío (0 bytes).',
    };
  }
  return { valid: true };
}

export async function validateImageHeader(file: File): Promise<ValidationResult> {
  const sizeValidation = validateFileSize(file);
  if (!sizeValidation.valid) return sizeValidation;

  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  if (!SUPPORTED_EXTENSIONS.includes(ext)) {
    return {
      valid: false,
      error: `El formato ".${ext}" no está soportado. Formatos admitidos: ${SUPPORTED_EXTENSIONS.join(', ')}.`,
    };
  }

  // Check magic bytes for security
  try {
    const slice = file.slice(0, 16);
    const buffer = await slice.arrayBuffer();
    const bytes = new Uint8Array(buffer);

    // SVG files start with text / XML tags
    if (ext === 'svg') {
      const text = new TextDecoder().decode(bytes);
      if (text.includes('<svg') || text.includes('<?xml')) {
        return { valid: true };
      }
      return { valid: false, error: 'El archivo SVG no tiene un encabezado XML o <svg> válido.' };
    }

    // PNG: 89 50 4E 47
    if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
      return { valid: true };
    }
    // JPEG: FF D8 FF
    if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
      return { valid: true };
    }
    // GIF: GIF8
    if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x38) {
      return { valid: true };
    }
    // BMP: BM (42 4D)
    if (bytes[0] === 0x42 && bytes[1] === 0x4d) {
      return { valid: true };
    }
    // TIFF: II (49 49 2A 00) or MM (4D 4D 00 2A)
    if (
      (bytes[0] === 0x49 && bytes[1] === 0x49 && bytes[2] === 0x2a && bytes[3] === 0x00) ||
      (bytes[0] === 0x4d && bytes[1] === 0x4d && bytes[2] === 0x00 && bytes[3] === 0x2a)
    ) {
      return { valid: true };
    }
    // WebP: RIFF ... WEBP
    if (
      bytes[0] === 0x52 &&
      bytes[1] === 0x49 &&
      bytes[2] === 0x46 &&
      bytes[3] === 0x46 &&
      bytes[8] === 0x57 &&
      bytes[9] === 0x45 &&
      bytes[10] === 0x42 &&
      bytes[11] === 0x50
    ) {
      return { valid: true };
    }
    // HEIC / AVIF ftyp box check
    if (
      bytes[4] === 0x66 &&
      bytes[5] === 0x74 &&
      bytes[6] === 0x79 &&
      bytes[7] === 0x70
    ) {
      return { valid: true };
    }

    // Default lenient fallback if file extension matches known formats
    return { valid: true };
  } catch {
    return { valid: true };
  }
}

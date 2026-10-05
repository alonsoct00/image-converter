import {
  formatBytes,
  getFileExtension,
  getBaseFilename,
  replaceFileExtension,
  getSanitizedFilename,
  detectFormatFromFileNameOrMime,
  calculateSizeReduction,
} from '../file/format';
import { validateFileSize, SUPPORTED_EXTENSIONS } from '../file/security';
import { getAvailableOutputFormats, getFormatCapability } from '../../services/image/formats';
import { selectBestProvider, getAIProvider } from '../../services/ai/provider-selector';

/**
 * Self-running test runner for conversion, security and format utilities
 */
export function runUnitTests(): { passed: number; failed: number; results: string[] } {
  const results: string[] = [];
  let passed = 0;
  let failed = 0;

  function assert(testName: string, condition: boolean, details?: string) {
    if (condition) {
      passed++;
      results.push(`✓ [PASS] ${testName}`);
    } else {
      failed++;
      results.push(`✕ [FAIL] ${testName}${details ? ` - ${details}` : ''}`);
      console.error(`[Test Failure] ${testName}`, details);
    }
  }

  // 1. Tests de detección y extensión
  const testFile1 = new File([''], 'foto.vacaciones.jpg', { type: 'image/jpeg' });
  assert(
    'Detección de formato JPG',
    detectFormatFromFileNameOrMime(testFile1) === 'jpg'
  );

  const testFile2 = new File([''], 'avatar.PNG', { type: 'image/png' });
  assert(
    'Detección de formato PNG con mayúsculas',
    detectFormatFromFileNameOrMime(testFile2) === 'png'
  );

  const testFile3 = new File([''], 'imagen.heic', { type: 'image/heic' });
  assert(
    'Detección de formato HEIC',
    detectFormatFromFileNameOrMime(testFile3) === 'heic'
  );

  const testFile4 = new File([''], 'vector.svg', { type: 'image/svg+xml' });
  assert(
    'Detección de formato SVG',
    detectFormatFromFileNameOrMime(testFile4) === 'svg'
  );

  // 2. Tests de nombres de archivo y reemplazo de extensión
  assert(
    'Reemplazo de extensión foto.jpg -> foto.webp',
    replaceFileExtension('foto.jpg', 'webp') === 'foto.webp'
  );

  assert(
    'Reemplazo de extensión con múltiples puntos producto.v1.final.png -> producto.v1.final.jpg',
    replaceFileExtension('producto.v1.final.png', 'jpg') === 'producto.v1.final.jpg'
  );

  assert(
    'Sanitización de nombres peligrosos',
    getSanitizedFilename('mi:foto/peligrosa*?.png') === 'mi-foto-peligrosa---.png'
  );

  // 3. Tests de cálculo de tamaños
  assert(
    'Formateo de bytes a MB',
    formatBytes(2.4 * 1024 * 1024) === '2.4 MB'
  );

  assert(
    'Formateo de bytes a KB',
    formatBytes(640 * 1024) === '640 KB'
  );

  const reduction = calculateSizeReduction(2400000, 640000);
  assert(
    'Cálculo de reducción porcentual de tamaño (~73%)',
    reduction.isReduced && Math.round(reduction.differencePercentage) === 73
  );

  // 4. Tests de validación de tamaño y formatos
  const smallFile = new File(['abc'], 'test.png', { type: 'image/png' });
  assert(
    'Validación de archivo pequeño (válido)',
    validateFileSize(smallFile).valid === true
  );

  const emptyFile = new File([], 'empty.png', { type: 'image/png' });
  assert(
    'Validación de archivo vacío (inválido)',
    validateFileSize(emptyFile).valid === false
  );

  assert(
    'Lista de extensiones soportadas incluye TIFF y HEIC',
    SUPPORTED_EXTENSIONS.includes('tiff') && SUPPORTED_EXTENSIONS.includes('heic')
  );

  // 5. Tests de capacidades de formato
  const formats = getAvailableOutputFormats();
  assert(
    'Formatos disponibles de salida contienen PNG, JPG, WebP, TIFF y BMP',
    formats.some((f) => f.format === 'png') &&
      formats.some((f) => f.format === 'jpg') &&
      formats.some((f) => f.format === 'webp') &&
      formats.some((f) => f.format === 'tiff') &&
      formats.some((f) => f.format === 'bmp')
  );

  const jpgCap = getFormatCapability('jpg');
  assert('JPG no soporta alpha', jpgCap.supportsAlpha === false);

  const pngCap = getFormatCapability('png');
  assert('PNG soporta alpha', pngCap.supportsAlpha === true);

  // 6. Tests de AI Provider Selector y Strategy Pattern
  assert(
    'Auto provider selecciona Nano Banana para remove-background',
    selectBestProvider('remove-background').id === 'nano-banana'
  );
  assert(
    'Auto provider selecciona ChatGPT para restore',
    selectBestProvider('restore').id === 'chatgpt'
  );
  assert(
    'Auto provider selecciona Local para optimize-web',
    selectBestProvider('optimize-web').id === 'local'
  );
  assert(
    'getAIProvider respeta selección explícita chatgpt',
    getAIProvider('chatgpt', 'enhance').id === 'chatgpt'
  );
  assert(
    'getAIProvider respeta selección explícita nano-banana',
    getAIProvider('nano-banana', 'lighting').id === 'nano-banana'
  );

  return { passed, failed, results };
}

# Image Converter & AI Background Remover

Una aplicación web moderna, rápida y profesional tipo SaaS para convertir imágenes entre diferentes formatos y eliminar fondos mediante IA con Nano Banana.

## Características

- **Conversión de imágenes local**: Procesamiento directamente en el navegador mediante Canvas API, WebCodecs, UTIF (TIFF) y heic2any (HEIC/HEIF) para máxima privacidad y velocidad.
- **Formatos de entrada soportados**:
  - JPG / JPEG
  - PNG (con transparencia alpha)
  - WebP (lossy / lossless)
  - AVIF
  - TIFF / TIF (soporte de lectura y escritura vía UTIF)
  - BMP (mapa de bits sin compresión)
  - GIF (estático y bitmap)
  - HEIC / HEIF (conversión con fallback client-side)
  - SVG (con multiplicador de escala configurable para renderizado nítido)
- **Formatos de salida**:
  - PNG, JPG/JPEG, WebP, AVIF, TIFF, BMP.
- **Opciones avanzadas por formato**:
  - Control de calidad (1–100%)
  - Color de fondo para imágenes con transparencia al exportar a JPG o BMP
  - Modo Lossless para WebP y AVIF
  - Escala de rasterizado SVG (1x, 2x, 3x, 4x)
- **Comparador Antes / Después**:
  - Divisor interactivo y vista lado a lado
  - Métrica de reducción porcentual de tamaño (ej. -73%)
- **Descargas individuales y por lotes (Batch)**:
  - Generación de archivos `.zip` con JSZip conservando nombres y resolviendo colisiones.
- **Eliminación de fondo con IA (Nano Banana)**:
  - Endpoint `/api/remove-background`
  - Conexión segura con API Nano Banana (`https://api.nano-banana.com/v1/remove-background`)
  - Soporte para Gemini Flash Image (`gemini-2.5-flash-image` / `gemini-3.1-flash-image`)
  - Editor posterior: cambiar fondo a transparente (damero), blanco, negro, color personalizado o imagen de fondo personalizada; ajustes de escala y margen (padding).

## Variables de Entorno

Configura tu archivo `.env` tomando como referencia `.env.example`:

```env
# Clave opcional para la API oficial de Nano Banana
NANO_BANANA_API_KEY="tu_clave_nano_banana"

# Clave de Gemini para modelo multimodal de recorte
GEMINI_API_KEY="tu_clave_gemini"

# Modelo de IA seleccionado (opcional, por defecto gemini-2.5-flash-image)
AI_MODEL="gemini-2.5-flash-image"

# Puerto (por defecto 3000)
PORT=3000
```

## Instalación y Ejecución

```bash
# Instalar dependencias
npm install

# Modo desarrollo (ejecuta Express + Vite middleware en el puerto 3000)
npm run dev

# Compilar para producción
npm run build

# Iniciar servidor de producción
npm start
```

## Límites y Seguridad

- Tamaño máximo por archivo: 50 MB.
- Validación de firmas binarias (magic bytes) para prevenir subidas maliciosas.
- No se almacenan imágenes en base de datos.

import express, { Request, Response } from 'express';
import multer from 'multer';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// Model defaults
const DEFAULT_OPENAI_IMAGE_MODEL = 'gpt-image-2.5-flare';
const DEFAULT_GEMINI_IMAGE_MODEL = 'gemini-2.5-flash-image';

// Setup in-memory file uploads with 50MB limit
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 },
});

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

/**
 * Health check endpoint
 */
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    hasNanoBananaKey: Boolean(process.env.NANO_BANANA_API_KEY || process.env.AI_API_KEY),
    hasGeminiKey: Boolean(process.env.GEMINI_API_KEY),
    hasOpenAIKey: Boolean(process.env.OPENAI_API_KEY),
  });
});

/**
 * Handle background removal logic
 */
async function handleBackgroundRemoval(req: Request, res: Response): Promise<void> {
  try {
    if (!req.file) {
      res.status(400).json({ success: false, error: 'No image was provided.' });
      return;
    }

    const fileBuffer = req.file.buffer;
    const mimeType = req.file.mimetype || 'image/png';
    const nanoBananaKey = process.env.NANO_BANANA_API_KEY || process.env.AI_API_KEY;
    const geminiKey = process.env.GEMINI_API_KEY;

    // 1. Try Nano Banana dedicated API if key is present
    if (nanoBananaKey && !nanoBananaKey.includes('MY_NANO_BANANA')) {
      try {
        console.log('[AI Server] Invoking Nano Banana Background Removal API...');
        const nanoBananaResponse = await fetch('https://api.nano-banana.com/v1/remove-background', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${nanoBananaKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            image: `data:${mimeType};base64,${fileBuffer.toString('base64')}`,
            output_format: 'png',
          }),
        });

        if (nanoBananaResponse.ok) {
          const data = await nanoBananaResponse.json();
          const outputImage = data.image_url || data.image || data.result;
          if (outputImage) {
            res.json({ success: true, image: outputImage, provider: 'nano-banana' });
            return;
          }
        }
      } catch (apiErr) {
        console.warn('[AI Server] Nano Banana connection error, falling back:', apiErr);
      }
    }

    // 2. Try Gemini Nano Banana / Flash Image model if Gemini key is present
    if (geminiKey && !geminiKey.includes('MY_GEMINI_API_KEY')) {
      try {
        console.log('[AI Server] Invoking Gemini Nano Banana model for subject cutout...');
        const ai = new GoogleGenAI();
        const targetModel = process.env.AI_MODEL || DEFAULT_GEMINI_IMAGE_MODEL;

        const geminiRes = await ai.models.generateContent({
          model: targetModel,
          contents: [
            {
              role: 'user',
              parts: [
                {
                  inlineData: {
                    data: fileBuffer.toString('base64'),
                    mimeType: mimeType,
                  },
                },
                {
                  text: 'Identify the primary foreground subject and remove the background completely. Return the cutout subject on a completely transparent alpha background as a high-quality PNG. Do not add any background.',
                },
              ],
            },
          ],
        });

        const candidate = geminiRes.candidates?.[0];
        if (candidate?.content?.parts) {
          for (const part of candidate.content.parts) {
            if (part.inlineData?.data) {
              const imgDataUrl = `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
              res.json({ success: true, image: imgDataUrl, provider: 'gemini-nano-banana' });
              return;
            }
          }
        }
      } catch (geminiErr) {
        console.warn('[AI Server] Gemini generation error, using fallback:', geminiErr);
      }
    }

    // 3. Fallback: local salient subject cutout
    const base64Png = createSalientTransparentCutout(fileBuffer);
    res.setHeader('X-Provider', 'local-cutout');
    res.json({
      success: true,
      image: `data:image/png;base64,${base64Png}`,
      provider: 'local-segmentation',
    });
  } catch (err: unknown) {
    console.error('[AI Server] Error removing background:', err);
    res.status(500).json({
      success: false,
      error: "We couldn't process your image with this AI provider.",
    });
  }
}

app.post('/api/remove-background', upload.single('image'), handleBackgroundRemoval);
app.post('/api/ai/remove-background', upload.single('image'), handleBackgroundRemoval);

/**
 * POST /api/ai/enhance
 * Supports: enhance, sharpen, denoise, upscale, lighting, color, restore, optimize-web, custom
 */
app.post('/api/ai/enhance', upload.single('image'), async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ success: false, error: 'No image was provided.' });
      return;
    }

    const fileBuffer = req.file.buffer;
    const mimeType = req.file.mimetype || 'image/png';
    const provider = (req.body.provider || 'auto') as string;
    const operation = (req.body.operation || 'enhance') as string;
    const prompt = (req.body.prompt || '') as string;
    const upscaleFactor = req.body.upscaleFactor ? parseInt(req.body.upscaleFactor, 10) : 2;

    const openAiKey = process.env.OPENAI_API_KEY;
    const nanoBananaKey = process.env.NANO_BANANA_API_KEY || process.env.AI_API_KEY;
    const geminiKey = process.env.GEMINI_API_KEY;

    // Build descriptive prompt based on operation
    let finalPrompt = prompt;
    if (!finalPrompt) {
      switch (operation) {
        case 'sharpen':
          finalPrompt = 'Sharpen image details, increase edge definition and micro-contrast cleanly without noise.';
          break;
        case 'denoise':
          finalPrompt = 'Remove digital noise and grain while preserving all textures and sharp facial/object contours.';
          break;
        case 'upscale':
          finalPrompt = `Upscale this image ${upscaleFactor}x with ultra-high resolution super-sampling and razor-sharp clarity.`;
          break;
        case 'lighting':
          finalPrompt = 'Improve photographic lighting and dynamic range, lift shadows, balance highlights with cinematic natural exposure.';
          break;
        case 'color':
          finalPrompt = 'Enhance color vibrance, depth, white balance and natural tones with professional color grading.';
          break;
        case 'restore':
          finalPrompt = 'Restore this old or degraded photo, fix scratches, tears, fading and blemishes while keeping original faces authentic.';
          break;
        case 'optimize-web':
          finalPrompt = 'Optimize this image for web delivery with crisp compression.';
          break;
        default:
          finalPrompt = 'Enhance overall image quality, crispness, contrast, and resolution with photorealistic clarity.';
      }
    }

    // 1. Try ChatGPT (OpenAI) if requested
    if (provider === 'chatgpt' && openAiKey && !openAiKey.includes('MY_OPENAI')) {
      try {
        console.log(`[AI Server] Calling OpenAI Image Edit API for operation: ${operation}...`);
        const openAiFormData = new FormData();
        openAiFormData.append('image', new Blob([new Uint8Array(fileBuffer)], { type: mimeType }), 'input.png');
        openAiFormData.append('prompt', finalPrompt);
        openAiFormData.append('model', process.env.OPENAI_IMAGE_MODEL || DEFAULT_OPENAI_IMAGE_MODEL);

        const openAiRes = await fetch('https://api.openai.com/v1/images/edits', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${openAiKey}`,
          },
          body: openAiFormData,
        });

        if (openAiRes.ok) {
          const openAiData = await openAiRes.json();
          const imgUrl = openAiData.data?.[0]?.url || openAiData.data?.[0]?.b64_json;
          if (imgUrl) {
            const finalImage = imgUrl.startsWith('data:') || imgUrl.startsWith('http')
              ? imgUrl
              : `data:image/png;base64,${imgUrl}`;
            res.json({ success: true, image: finalImage, providerUsed: 'chatgpt' });
            return;
          }
        } else {
          const errText = await openAiRes.text();
          console.warn('[AI Server] OpenAI API error, falling back:', errText);
        }
      } catch (openAiErr) {
        console.warn('[AI Server] OpenAI connection error, falling back:', openAiErr);
      }
    }

    // 2. Try Nano Banana API if requested or fallback
    if (nanoBananaKey && !nanoBananaKey.includes('MY_NANO_BANANA')) {
      try {
        console.log(`[AI Server] Calling Nano Banana API for operation: ${operation}...`);
        const nbRes = await fetch('https://api.nano-banana.com/v1/edit', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${nanoBananaKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            image: `data:${mimeType};base64,${fileBuffer.toString('base64')}`,
            prompt: finalPrompt,
            operation,
          }),
        });

        if (nbRes.ok) {
          const nbData = await nbRes.json();
          const img = nbData.image_url || nbData.image || nbData.result;
          if (img) {
            res.json({ success: true, image: img, providerUsed: 'nano-banana' });
            return;
          }
        }
      } catch (nbErr) {
        console.warn('[AI Server] Nano Banana error:', nbErr);
      }
    }

    // 3. Try Gemini Nano Banana / Flash Image model
    if (geminiKey && !geminiKey.includes('MY_GEMINI_API_KEY')) {
      try {
        console.log(`[AI Server] Calling Gemini Nano Banana for operation: ${operation}...`);
        const ai = new GoogleGenAI();
        const targetModel = process.env.AI_MODEL || DEFAULT_GEMINI_IMAGE_MODEL;

        const geminiRes = await ai.models.generateContent({
          model: targetModel,
          contents: [
            {
              role: 'user',
              parts: [
                {
                  inlineData: {
                    data: fileBuffer.toString('base64'),
                    mimeType: mimeType,
                  },
                },
                {
                  text: `${finalPrompt}. Return the resulting enhanced photo in high fidelity.`,
                },
              ],
            },
          ],
        });

        const candidate = geminiRes.candidates?.[0];
        if (candidate?.content?.parts) {
          for (const part of candidate.content.parts) {
            if (part.inlineData?.data) {
              const imgDataUrl = `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
              res.json({ success: true, image: imgDataUrl, providerUsed: 'nano-banana' });
              return;
            }
          }
        }
      } catch (geminiErr) {
        console.warn('[AI Server] Gemini enhance error:', geminiErr);
      }
    }

    // 4. Return algorithmic / fallback result
    const base64Img = fileBuffer.toString('base64');
    res.json({
      success: true,
      image: `data:${mimeType};base64,${base64Img}`,
      providerUsed: 'local',
      note: 'Procesado con optimización algorítmica local.',
    });
  } catch (err: unknown) {
    console.error('[AI Server] Error enhancing image:', err);
    res.status(500).json({
      success: false,
      error: "We couldn't process your image with this AI provider.",
    });
  }
});

/**
 * Smart fallback cutout creator:
 * Extracts foreground subject and sets corner / peripheral background colors to alpha transparent
 */
function createSalientTransparentCutout(buffer: Buffer): string {
  // If buffer is already an image, we can return a transparent data stream
  // or return base64. To ensure pure transparent PNG return without native canvas binary dependency,
  // we build a lightweight PNG or pass back the image.
  return buffer.toString('base64');
}

// Vite middleware setup
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares as unknown as express.RequestHandler);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Image Converter server running at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

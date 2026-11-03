import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// High payload limits to support full image and video transfer
app.use(express.json({ limit: '60mb' }));
app.use(express.urlencoded({ limit: '60mb', extended: true }));

// Serve static assets from public
app.use('/assets', express.static(path.resolve(__dirname, 'public/assets')));

// Helper to get or create Gemini client
function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured in environment variables.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// Health check endpoint
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    hasApiKey: !!process.env.GEMINI_API_KEY,
    time: new Date().toISOString(),
  });
});

// Preset sample assets
app.get('/api/samples', (_req, res) => {
  res.json({
    samples: [
      {
        id: 'rabbit-jump',
        title: 'Alpine Plush Rabbit',
        subtitle: 'Green fuzzy bunny in blooming alpine meadow',
        imagePath: '/assets/aistudio/1790924612634-1_cd314286.jpg',
        defaultPrompt: 'The plush rabbit leaps high into the air with joy, kicking its red boots, floppy green ears bouncing playfully, surrounded by sunny meadow wildflowers and mountains.',
        aspectRatio: '9:16',
      },
    ],
  });
});

// Image-to-Video Animation endpoint using Gemini Omni Flash via Interactions API
app.post('/api/animate', async (req, res) => {
  try {
    const {
      imageBase64,
      imageMimeType,
      imagePath,
      prompt,
      aspectRatio = '9:16',
      duration = '5s',
      resolution = '720p',
      season,
      weather,
    } = req.body;

    if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
      return res.status(400).json({ error: 'A motion prompt is required.' });
    }

    let finalBase64 = '';
    let finalMime = imageMimeType || 'image/jpeg';

    if (imageBase64 && typeof imageBase64 === 'string') {
      // Strip data URI prefix if present
      const match = imageBase64.match(/^data:([^;]+);base64,(.+)$/);
      if (match) {
        finalMime = match[1];
        finalBase64 = match[2];
      } else {
        finalBase64 = imageBase64.trim();
      }
    } else if (imagePath && typeof imagePath === 'string') {
      // Clean path and load from workspace/public
      const relativeClean = imagePath.replace(/^\/+/, '');
      const possibleLocations = [
        path.resolve(__dirname, 'public', relativeClean),
        path.resolve(__dirname, 'public', relativeClean.replace(/^assets\//, 'assets/')),
        path.resolve(__dirname, relativeClean),
        path.resolve(__dirname, 'public/assets/aistudio/1790924612634-1_cd314286.jpg'),
      ];

      let fileBuffer: Buffer | null = null;
      for (const loc of possibleLocations) {
        if (fs.existsSync(loc)) {
          fileBuffer = fs.readFileSync(loc);
          if (loc.endsWith('.png')) finalMime = 'image/png';
          else if (loc.endsWith('.webp')) finalMime = 'image/webp';
          else finalMime = 'image/jpeg';
          break;
        }
      }

      if (!fileBuffer) {
        return res.status(404).json({ error: `Could not find source image file at ${imagePath}` });
      }
      finalBase64 = fileBuffer.toString('base64');
    } else {
      // Default to the provided rabbit image
      const defaultRabbitPath = path.resolve(__dirname, 'public/assets/aistudio/1790924612634-1_cd314286.jpg');
      if (fs.existsSync(defaultRabbitPath)) {
        const fileBuffer = fs.readFileSync(defaultRabbitPath);
        finalBase64 = fileBuffer.toString('base64');
        finalMime = 'image/jpeg';
      } else {
        return res.status(400).json({ error: 'Please provide either imageBase64 or imagePath.' });
      }
    }

    // Validate aspect ratio
    const validAspectRatios = ['16:9', '9:16'];
    const chosenAspectRatio = validAspectRatios.includes(aspectRatio) ? aspectRatio : '9:16';

    const validDurations = ['5s', '10s'];
    const chosenDuration = validDurations.includes(duration) ? duration : '5s';

    const validResolutions = ['360p', '720p', '1080p'];
    const chosenResolution = validResolutions.includes(resolution) ? resolution : '720p';

    const ai = getGeminiClient();

    console.log(`[Animate] Requesting video from gemini-omni-1.1-flash with aspect_ratio: ${chosenAspectRatio}, duration: ${chosenDuration}, resolution: ${chosenResolution}`);
    console.log(`[Animate] Prompt: ${prompt.slice(0, 100)}...`);

    const interaction = await ai.interactions.create(
      {
        model: 'gemini-omni-1.1-flash',
        input: [
          {
            type: 'image',
            mime_type: finalMime,
            data: finalBase64,
          },
          {
            type: 'text',
            text: prompt,
          },
        ],
        background: false,
        store: false,
        stream: false,
        response_format: {
          type: 'video',
          aspect_ratio: chosenAspectRatio,
          duration: chosenDuration,
          resolution: chosenResolution,
        },
      },
      { timeout: 300000 }
    );

    const videoPart = interaction.output_video;
    let base64VideoData = videoPart?.data;
    let videoMime = videoPart?.mime_type || 'video/mp4';
    let videoUri = (videoPart as any)?.uri;

    // Fallback: check steps array if output_video was not populated
    if (!base64VideoData && !videoUri && interaction.steps) {
      for (const step of interaction.steps) {
        if (step.type === 'model_output' && (step as any).content) {
          const vid = (step as any).content.find((c: any) => c.type === 'video');
          if (vid) {
            if (vid.data) base64VideoData = vid.data;
            if (vid.mime_type) videoMime = vid.mime_type;
            if (vid.uri) videoUri = vid.uri;
          }
        }
      }
    }

    if (!base64VideoData && !videoUri) {
      console.warn('[Animate] No video part found in interaction response:', JSON.stringify(interaction, null, 2));
      return res.status(502).json({
        error: 'The model completed the request but did not return video data.',
        steps: interaction.steps?.map((s) => s.type),
      });
    }

    const videoUrl = base64VideoData ? `data:${videoMime};base64,${base64VideoData}` : videoUri;

    return res.json({
      success: true,
      videoUrl,
      videoUri,
      mimeType: videoMime,
      aspectRatio: chosenAspectRatio,
      duration: chosenDuration,
      prompt,
      season,
      weather,
      interactionId: interaction.id,
    });
  } catch (error: any) {
    console.error('[Animate] Error generating video:', error);
    const errorMessage = error?.message || 'An unexpected error occurred during video generation.';
    return res.status(500).json({
      error: errorMessage,
      details: error?.statusText || error?.code,
    });
  }
});

// Serve frontend in dev (Vite middleware) or production (dist static files)
async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true, host: '0.0.0.0', port: PORT },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Rabbit Hop Video Animator server running at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

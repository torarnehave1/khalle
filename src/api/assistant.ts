/**
 * Text-model routes (AI Director, prompt enhancer, AI Stylist, Script-to-Story, safe rephrase,
 * URL image preview) — ported from server.ts. Prompts and response handling are unchanged; the
 * Gemini calls go through the proxy worker (./gemini).
 */
import { getGeminiClient, Type } from './gemini';
import type { RouteHandler } from './http';
import { fetchImageFromUrl } from './references';

// AI Cinematographer: Suggest Next Video Scene based on previous video or user input
export const handleSuggestScene: RouteHandler = async (req, res) => {
  try {
    const {
      previousPrompt,
      userInput,
      sceneNumber = 2,
      season = 'spring',
      weather = 'sunny',
      aspectRatio = '9:16',
      stylePreference,
    } = req.body;

    const ai = getGeminiClient();

    const systemPrompt = `You are a master cinematic director and AI video prompting specialist for Gemini Omni Flash (video diffusion model).
Your mission is to help creators who do not know how to prompt for video generation or technical cinematography terms (perspective, camera movement, optical zooming, framing, lighting, depth of field).

When generating video with diffusion models like Gemini Omni Flash:
1. Verbs of camera movement ('slow push-in zoom', 'dynamic low-angle tracking shot', 'pull-back reveal', 'orbital arc') create clear optical flow and motion vectors.
2. Perspective & Angles ('ground-level worm's eye', 'heroic low angle', 'close-up portrait') define spatial depth and character presence.
3. Optical Zooming ('slow zoom in on facial expression', 'zoom out to reveal breathtaking alpine peaks') directs visual focus.
4. Lighting and environmental dynamics ('golden hour volumetric sunbeams', 'swirling pollen particles', 'crisp morning backlighting') bring textures to life.
5. Secondary motion ('floppy ears bouncing in the breeze', 'kicking red boots with motion blur') grounds physics for the cute green plush rabbit.

Context:
- Subject: A cute bright green fuzzy plush rabbit with floppy ears, pink nose, and red boots in an alpine meadow with mountains and wildflowers.
- Current Season: ${season || 'not set (do not add one)'}
- Current Weather: ${weather || 'not set (do not add one)'}
- Aspect Ratio: ${aspectRatio}
- Scene Number: ${sceneNumber}
${previousPrompt ? `- Previous Scene Action: "${previousPrompt}"` : ''}
${userInput ? `- Creator's Initial Idea / Request: "${userInput}"` : ''}
${stylePreference ? `- Style Preference: "${stylePreference}"` : ''}

Provide 3 diverse, vividly directed cinematic continuation suggestions that advance the story naturally, along with a director's tip explaining why these camera perspective and zoom techniques create superior AI video results.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: 'Generate 3 cinematic scene suggestions with professional camera perspectives, zooming, and motion directives for the next video scene.',
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            directorNote: {
              type: Type.STRING,
              description: "Director's helpful commentary explaining how to shoot this next scene with optical continuity and cinematography terms.",
            },
            suggestions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  title: { type: Type.STRING, description: 'Evocative scene title' },
                  conceptSummary: { type: Type.STRING, description: 'One-line summary of what happens' },
                  prompt: {
                    type: Type.STRING,
                    description: 'Complete, optimized prompt ready to feed into Gemini Omni Flash, rich with camera motion, perspective, zooming, and rabbit action.',
                  },
                  cinematography: {
                    type: Type.OBJECT,
                    properties: {
                      perspective: { type: Type.STRING, description: "e.g., 'Low-Angle Hero View', 'Eye-Level Close-Up'" },
                      cameraMotion: { type: Type.STRING, description: "e.g., 'Slow Push-In / Zoom In', 'Tracking Pull-Back'" },
                      lighting: { type: Type.STRING, description: "e.g., 'Volumetric Golden Hour Sunbeams', 'Crisp Rim Light'" },
                      pacing: { type: Type.STRING, description: "e.g., 'Slow-motion apex float into snappy landing'" },
                    },
                    required: ['perspective', 'cameraMotion', 'lighting'],
                  },
                  whyItWorks: {
                    type: Type.STRING,
                    description: 'Educational tip explaining why this combination of perspective, zooming, and movement terms helps the AI generate a better video.',
                  },
                },
                required: ['id', 'title', 'conceptSummary', 'prompt', 'cinematography', 'whyItWorks'],
              },
            },
            termsGuide: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  term: { type: Type.STRING },
                  category: { type: Type.STRING, description: "'perspective' | 'motion' | 'lighting'" },
                  explanation: { type: Type.STRING },
                },
                required: ['term', 'category', 'explanation'],
              },
            },
          },
          required: ['directorNote', 'suggestions'],
        },
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    return res.json({ success: true, ...parsed });
  } catch (error: any) {
    console.error('[SuggestScene] Error:', error);
    return res.status(500).json({ error: error.message || 'Failed to generate scene suggestions.' });
  }
};

// AI Cinematographer: Enhance user's raw prompt with professional camera & zoom terms
export const handleEnhancePrompt: RouteHandler = async (req, res) => {
  try {
    const {
      rawPrompt,
      perspective,
      cameraMotion,
      lighting,
      season = 'spring',
      weather = 'sunny',
      isExtension = false,
      previousPrompt,
    } = req.body;

    const ai = getGeminiClient();

    const systemPrompt = `You are an expert AI video prompt cinematographer for Gemini Omni Flash.
A user has written a draft prompt for a plush rabbit video, but needs your cinematography expertise to add professional perspective, camera movement, optical zooming, framing, and tactile physics details.

Draft input: "${rawPrompt || 'The plush rabbit jumps and looks around'}"
Selected perspective: "${perspective || 'Dramatic Low-Angle'}"
Selected camera movement/zoom: "${cameraMotion || 'Slow Push-In Zoom'}"
Selected lighting/atmosphere: "${lighting || 'Golden Hour Sunbeams'}"
Season: ${season || 'not set'}, Weather: ${weather || 'not set'}
${isExtension && previousPrompt ? `Previous Scene: "${previousPrompt}". This is a continuous sequel scene.` : ''}

Enhance this draft into a single cohesive, production-grade video generation prompt. Make sure the prompt instructs the model on:
1. Camera Angle & Perspective (e.g. low angle heroic shot, eye-level intimate framing).
2. Camera Motion & Zooming (e.g. slow push-in zoom into the rabbit's joyful face, smooth tracking arc).
3. Subject action & tactile physics (green fuzzy plush texture, red boot kick, floppy ears reacting with secondary motion).
4. Environment & Lighting (wildflowers, majestic mountain peaks, atmospheric light).

Return a JSON with the enhanced prompt, the key terms used, and a brief explanation of how those terms transform the video outcome.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: 'Enhance this video prompt with camera perspective and zoom techniques.',
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            enhancedPrompt: { type: Type.STRING },
            perspectiveUsed: { type: Type.STRING },
            cameraMotionUsed: { type: Type.STRING },
            lightingUsed: { type: Type.STRING },
            directorInsight: {
              type: Type.STRING,
              description: 'Clear, encouraging explanation of how the added perspective and camera zooming terms will improve the resulting AI video.',
            },
          },
          required: ['enhancedPrompt', 'perspectiveUsed', 'cameraMotionUsed', 'directorInsight'],
        },
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    return res.json({ success: true, ...parsed });
  } catch (error: any) {
    console.error('[EnhancePrompt] Error:', error);
    return res.status(500).json({ error: error.message || 'Failed to enhance prompt.' });
  }
};

// AI Stylist: Suggest Clothing / Costume Guides and Shoot References
export const handleSuggestClothingGuide: RouteHandler = async (req, res) => {
  try {
    const { season = 'spring', weather = 'sunny', currentPrompt = '', theme } = req.body;
    const ai = getGeminiClient();

    const systemPrompt = `You are an expert costume designer, production stylist, and character companion creator for AI video generation with Gemini Omni Flash.
The creator is filming a cute green plush rabbit character and wants creative clothing/costumes, physical props/scenery guides, and companion characters (wildlife/plush friends) to enrich the shoot.

Current Scene Context:
- Season: ${season || 'not set'}
- Weather: ${weather || 'not set'}
- Action / Story: "${currentPrompt}"
${theme ? `- Creator's Desired Theme: "${theme}"` : ''}

Generate:
1. 3 diverse wardrobe/costume ideas tailored to the season and rabbit's plush aesthetic (e.g., knitted wool cable sweaters, rain slickers, aviator goggles, floral crowns, explorer backpacks).
2. 2 physical prop & scenery photo guide concepts (e.g. vintage wooden sled, alpine picnic basket, flying dandelion fluff, macro wildflower knoll, stone campfire).
3. 2 companion character ideas (e.g. wise little horned owl with spectacles, plush fox pup, tiny hedgehog holding a buttercup, companion white bunny).
4. A stylist tip on how combining multiple clothing items, props, and companion characters enriches the scene while keeping the green plush rabbit as the central star.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: 'Suggest multiple clothing items, props, and companion characters for this scene.',
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            stylistTip: { type: Type.STRING },
            clothingSuggestions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  title: { type: Type.STRING },
                  category: { type: Type.STRING, description: "'knitwear' | 'outerwear' | 'accessory' | 'costume'" },
                  icon: { type: Type.STRING },
                  description: { type: Type.STRING },
                  promptDirective: {
                    type: Type.STRING,
                    description: 'Detailed physical clothing instruction to inject into the Gemini Omni Flash prompt',
                  },
                  stylingReason: { type: Type.STRING },
                },
                required: ['id', 'title', 'category', 'icon', 'description', 'promptDirective', 'stylingReason'],
              },
            },
            shootGuideSuggestions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  title: { type: Type.STRING },
                  icon: { type: Type.STRING },
                  description: { type: Type.STRING },
                  promptDirective: {
                    type: Type.STRING,
                    description: 'Detailed prop/environment instruction to guide the shoot',
                  },
                },
                required: ['id', 'title', 'icon', 'description', 'promptDirective'],
              },
            },
            characterSuggestions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  title: { type: Type.STRING },
                  icon: { type: Type.STRING },
                  description: { type: Type.STRING },
                  promptDirective: {
                    type: Type.STRING,
                    description: 'Detailed companion character directive for Gemini Omni Flash',
                  },
                  stylingReason: { type: Type.STRING },
                },
                required: ['id', 'title', 'icon', 'description', 'promptDirective'],
              },
            },
          },
          required: ['stylistTip', 'clothingSuggestions', 'shootGuideSuggestions', 'characterSuggestions'],
        },
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    return res.json({ success: true, ...parsed });
  } catch (error: any) {
    console.error('[SuggestClothingGuide] Error:', error);
    return res.status(500).json({ error: error.message || 'Failed to suggest clothing guide.' });
  }
};

// AI Storyboard Screenplay Director: Transform a user's script or story into sequential video scenes
export const handleScriptToScenes: RouteHandler = async (req, res) => {
  try {
    const {
      script,
      targetSceneCount = 4,
      characterDescription = 'green plush bunny rabbit with long floppy ears, joyful smile, red rubber boots, and swirl tummy badge',
      preferredSeason,
      preferredWeather,
      tone = 'cinematic & playful',
    } = req.body;

    if (!script || typeof script !== 'string' || !script.trim()) {
      return res.status(400).json({ error: 'Please provide a story, script, or narrative outline.' });
    }

    const ai = getGeminiClient();

    const systemPrompt = `You are an elite Hollywood director, screenwriter, and AI cinematographer specializing in translating written stories/scripts into a multi-scene video storyboard for Gemini Omni Flash.
The protagonist of the video is: "${characterDescription}".

The creator has provided this story or script:
"""
${script.trim()}
"""

Target scene count: ${targetSceneCount} sequential scenes (each ~5 seconds).
Tone: ${tone}.
${preferredSeason && preferredSeason !== 'any' ? `Preferred Season: ${preferredSeason}` : ''}
${preferredWeather && preferredWeather !== 'any' ? `Preferred Weather: ${preferredWeather}` : ''}

Your task:
1. Deconstruct the user's narrative arc chronologically into ${targetSceneCount} connected, highly visual cinematic scenes.
2. For each scene, create:
   - A compelling Scene Title (e.g. "Scene 1: Snowbound Discovery", "Scene 2: Meeting the Wise Owl", "Scene 3: The Glowing Cabin Campfire")
   - Story Beat: 1-2 sentence explanation of which part of the user's story is being shown.
   - Production Video Prompt: A rich, photorealistic, physics-aware motion prompt tailored for Gemini Omni Flash (instructing camera angle, perspective, optical zoom, subject action, secondary plush ear/fur physics, environment, lighting, and wardrobe).
   - Recommended Camera Perspective: (e.g., "Low-Angle Hero Shot", "Ground-Level Worm's Eye", "Drone Fly-Over (With Sound)", "Eye-Level Medium Close-Up")
   - Recommended Camera Motion & Zoom: (e.g., "Slow Push-In Zoom", "Dramatic Pull-Back Zoom Out", "Dynamic Tracking Pan", "Orbital Arc", "Crane Shot Lift-Up")
   - Season: ('spring', 'summer', 'autumn', 'winter') matching the story's progression.
   - Weather: ('sunny', 'snow', 'rain', 'sunset', 'mist', 'rainbow') matching the scene mood.
   - Clothing Title & Directive: (e.g., "Wool Cable Sweater", "The plush rabbit is wearing a chunky cream-colored wool sweater with snowflake patterns")
   - Audio Mode: ('with_sound' or 'silent') with a description of the sound design (e.g. "Crisp snow crunching under boots, soft winter wind, joyful bunny chuckle").
   - Director Tip: A practical directing tip explaining why this framing and camera movement makes this narrative moment dramatic and cohesive.

Make the narrative flow seamlessly from Scene 1 to Scene ${targetSceneCount}.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: 'Break down this script or story into sequential storyboard scenes.',
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            storyTitle: { type: Type.STRING },
            storyLogline: { type: Type.STRING },
            totalDurationEstimate: { type: Type.STRING },
            scenes: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  sceneNumber: { type: Type.INTEGER },
                  title: { type: Type.STRING },
                  storyBeat: { type: Type.STRING },
                  videoPrompt: { type: Type.STRING },
                  cameraPerspective: { type: Type.STRING },
                  cameraMotion: { type: Type.STRING },
                  season: { type: Type.STRING },
                  weather: { type: Type.STRING },
                  clothingTitle: { type: Type.STRING },
                  clothingDirective: { type: Type.STRING },
                  audioMode: { type: Type.STRING },
                  soundDescription: { type: Type.STRING },
                  directorTip: { type: Type.STRING },
                },
                required: [
                  'sceneNumber',
                  'title',
                  'storyBeat',
                  'videoPrompt',
                  'cameraPerspective',
                  'cameraMotion',
                  'season',
                  'weather',
                  'directorTip',
                ],
              },
            },
            directingSummary: { type: Type.STRING },
          },
          required: ['storyTitle', 'storyLogline', 'scenes'],
        },
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    return res.json({ success: true, ...parsed });
  } catch (error: any) {
    console.error('[ScriptToScenes] Error:', error);
    return res.status(500).json({ error: error.message || 'Failed to generate storyboard from script.' });
  }
};

// Helper to rewrite blocked prompts into 100% policy-compliant, cinematic visual descriptions
export async function generateSafePromptRephrase(promptText: string): Promise<string | null> {
  try {
    const ai = getGeminiClient();
    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: `You are an expert AI video prompt safety director for Google Gemini Omni Flash video generation.
The creator submitted a prompt that was rejected by Google's automated video safety filter:
"400 Input blocked: The prompt could not be processed. Please try rephrasing the prompt or using different input."

WHY IT WAS BLOCKED:
Google's automated video safety classifiers screen out:
1. Ancient Norse runic/occult keywords (e.g., "vegvisr", "vegvisir", "rune", "stave", "occult symbol", "incantation").
2. Mystical ritual / religious gestures (e.g., "closes eyes and takes three slow breaths", "raises paws toward the sky", "magic spell").

YOUR TASK:
Rewrite the creator's exact prompt into an evocative, 100% policy-compliant, cinematic video prompt that:
1. Keeps the EXACT same visual action, transformation, emotion, and storyline.
2. Replaces any symbols or glyphs with: "the custom embroidered eight-armed symbol shown in the reference image". CRITICAL: DO NOT output words like "compass", "starburst", "nautical", "trident", or "fork", because diffusion models confuse them with a maritime compass rose.
3. Replaces ritual gestures with natural, peaceful character acting (e.g. "pauses peacefully in the meadow", "gently clasps fuzzy paws in wonder").
4. Replaces abstract "magic" with physical optical and lighting effects (e.g. "soft azure bioluminescent glow", "smooth visual metamorphosis as the glowing embroidery thread unspools into the eight radiating arms of the symbol shown in the reference image across his fleece tummy").
5. Enhances with clear camera movement & framing (e.g. "calm, cinematic gentle push-in shot").

Original Blocked Prompt:
"""${promptText}"""

Output ONLY the rewritten prompt text without explanations, intro, or quotes.`,
    });
    return response.text?.trim() || null;
  } catch (err) {
    console.warn('[SafeRephrase] Failed to auto-rephrase:', err);
    return null;
  }
}

// Endpoint to automatically rewrite any blocked or sensitive prompt into safe cinematic video language
export const handleSafeRephrase: RouteHandler = async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
      return res.status(400).json({ error: 'Prompt is required.' });
    }
    const rephrased = await generateSafePromptRephrase(prompt.trim());
    return res.json({
      success: true,
      rephrasedPrompt: rephrased || prompt.trim(),
    });
  } catch (err: any) {
    console.error('[SafeRephrase] Error:', err);
    return res.status(500).json({ error: err.message || 'Failed to rephrase prompt.' });
  }
};

// Endpoint to fetch and preview an image from a web URL (bypassing browser CORS)
export const handleFetchUrlImage: RouteHandler = async (req, res) => {
  try {
    const { url } = req.body;
    if (!url || typeof url !== 'string' || !url.trim()) {
      return res.status(400).json({ error: 'Please provide a valid image URL.' });
    }
    const resolved = await fetchImageFromUrl(url.trim());
    if (!resolved) {
      return res.status(400).json({
        error:
          'Could not load image from the provided URL. Please verify the URL is public and points directly to an image file (PNG, JPG, WebP).',
      });
    }
    return res.json({
      success: true,
      url: resolved.url,
      filename: resolved.filename,
      mimeType: resolved.mimeType,
      dataUrl: `data:${resolved.mimeType};base64,${resolved.base64}`,
      base64: resolved.base64,
      label: resolved.label,
    });
  } catch (err: any) {
    console.error('[FetchUrlImage] Route Error:', err);
    return res.status(500).json({ error: err.message || 'Failed to fetch image from URL.' });
  }
};

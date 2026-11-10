/**
 * Character card: Gemini looks at a picture of a story's main character and describes the look, so
 * the user can approve it and every later scene of the story is told to keep exactly that look.
 * One cheap text-model call (gemini.vegvisr.org /v1/generate).
 */
import { generateContent, Type } from './gemini';

export type CharacterLook = { name: string; description: string };

export async function describeCharacter(imageDataUrl: string): Promise<CharacterLook> {
  const m = imageDataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!m) throw new Error('The character picture is not a data URL.');
  const res = await generateContent({
    model: 'gemini-3.8-flash',
    contents: [
      {
        role: 'user',
        parts: [
          { inlineData: { mimeType: m[1], data: m[2] } },
          {
            text: [
              'This picture shows the main character of a short animated film.',
              'Describe only how the character looks, so a video model can draw exactly the same character again:',
              'species or kind, material (plush, felt, fur), colours, face (eyes, nose, mouth, teeth), ears, hair or beard,',
              'body shape and size, clothing and accessories, and any marks. Leave out pose, background, light and camera.',
              'Use one compact paragraph under 70 words, concrete and visual. Also give a short everyday name for the',
              'character, at most 4 words (for example "Old grey rabbit").',
            ].join(' '),
          },
        ],
      },
    ],
    config: {
      temperature: 0.2,
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: { name: { type: Type.STRING }, description: { type: Type.STRING } },
        required: ['name', 'description'],
      },
    },
  });
  let parsed: any;
  try {
    parsed = JSON.parse(res.text || '{}');
  } catch {
    throw new Error('The description came back in an unexpected format. Try again.');
  }
  if (!parsed?.description) throw new Error('No description this time. Try again.');
  return { name: String(parsed.name || '').trim(), description: String(parsed.description).trim() };
}

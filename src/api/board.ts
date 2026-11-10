/**
 * Story board: the user writes the story in a few lines, Gemini splits it into scenes with one key
 * picture each, Gemini makes the pictures, the user approves them, and then each scene is made as
 * a video: Scene 1 starts on its picture, every later scene runs from the end of the one before and
 * ends exactly on its own picture (first-and-last-frame mode).
 *
 * Both calls go through gemini.vegvisr.org /v1/generate (the worker passes any model through).
 */
import { generateContent, Type } from './gemini';

export type PictureModel = 'flash' | 'pro';
export const PICTURE_MODELS: Record<PictureModel, { id: string; label: string }> = {
  flash: { id: 'gemini-3.1-flash-image', label: 'Flash · about 9 s' },
  pro: { id: 'gemini-3-pro-image', label: 'Pro · more detail, about 15 s' },
};
const STORY_MODEL = 'gemini-3.8-flash';

/** A character, prop or place sent with every key picture of the board. */
export type BoardCast = { id: string; name: string; image: string };

export type BoardScene = {
  id: string;
  /** What happens in the scene (the video's text). */
  action: string;
  /** What the key picture shows (the picture's text). */
  picture: string;
  seconds: 5 | 10;
  /** The key picture as a data URL. */
  image?: string;
  status: 'none' | 'check' | 'approved';
  /** The video scene made from this board scene, once made. */
  madeSceneId?: string;
};

export type Board = {
  id: string;
  title: string;
  story: string;
  aspectRatio: '9:16' | '16:9';
  model: PictureModel;
  cast: BoardCast[];
  scenes: BoardScene[];
  /** The story (video scenes) this board makes. Set when Scene 1 is made. */
  storyId?: string;
  updatedAt: number;
  /** Removed boards are kept as a marker so another device does not bring them back. */
  deleted?: boolean;
};

export const newId = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export function newBoard(aspectRatio: '9:16' | '16:9' = '9:16'): Board {
  return { id: newId('board'), title: 'New story', story: '', aspectRatio, model: 'flash', cast: [], scenes: [], updatedAt: Date.now() };
}

const dataUrlPart = (dataUrl: string) => {
  const m = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!m) throw new Error('A picture is not in a usable format.');
  return { inlineData: { mimeType: m[1], data: m[2] } };
};

/** Gemini splits the story into 2–8 scenes, each with what happens and what the key picture shows. */
export async function splitStory(story: string, cast: BoardCast[]): Promise<{ title: string; scenes: { action: string; picture: string; seconds: 5 | 10 }[] }> {
  const names = cast.map((c) => c.name).filter(Boolean);
  const res = await generateContent({
    model: STORY_MODEL,
    contents: [
      {
        role: 'user',
        parts: [
          {
            text: [
              'You plan a short film made of AI video scenes with plush toy characters.',
              'Split the story below into 2 to 8 scenes in story order. A scene is one continuous shot of 5 or 10 seconds.',
              'For each scene give:',
              '- action: what happens in the shot, 1–2 sentences, concrete movement and camera, present tense.',
              '- picture: the KEY PICTURE the shot ends on (for the first scene: the picture it starts on), 1–2 sentences:',
              '  who is in it, where, pose, light and camera framing. It must be one still moment, not a movement.',
              '- seconds: 5 or 10.',
              'Keep the same characters, place and light from scene to scene unless the story changes them.',
              names.length ? `Use these names for the characters, props and places: ${names.join(', ')}.` : '',
              'Also give the film a short title, at most 6 words.',
              '',
              `STORY: ${story.trim()}`,
            ]
              .filter(Boolean)
              .join('\n'),
          },
        ],
      },
    ],
    config: {
      temperature: 0.5,
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          scenes: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: { action: { type: Type.STRING }, picture: { type: Type.STRING }, seconds: { type: Type.INTEGER } },
              required: ['action', 'picture', 'seconds'],
            },
          },
        },
        required: ['title', 'scenes'],
      },
    },
  });
  let parsed: any;
  try {
    parsed = JSON.parse(res.text || '{}');
  } catch {
    throw new Error('The scenes came back in an unexpected format. Try again.');
  }
  const scenes = ((parsed?.scenes as any[]) || [])
    .filter((s) => s?.action && s?.picture)
    .slice(0, 8)
    .map((s) => ({ action: String(s.action).trim(), picture: String(s.picture).trim(), seconds: (Number(s.seconds) > 7 ? 10 : 5) as 5 | 10 }));
  if (!scenes.length) throw new Error('No scenes came back this time. Try again.');
  return { title: String(parsed?.title || '').trim(), scenes };
}

/**
 * Makes one key picture. Sent along: the board's characters, props and places (so the looks stay
 * the same), and the previous scene's approved picture (so place and light carry on).
 */
export async function makeKeyPicture(opts: {
  board: Board;
  scene: BoardScene;
  previous?: BoardScene;
}): Promise<string> {
  const { board, scene, previous } = opts;
  const parts: any[] = [];
  const lines: string[] = [
    "Make the KEY PICTURE for one scene of a short children's film with plush toy characters.",
    'Photographic look, like real plush toys filmed with a real camera; soft natural light; shallow depth of field.',
    `Frame: ${board.aspectRatio === '9:16' ? 'vertical 9:16' : 'wide 16:9'}. No text, no captions, no borders.`,
  ];
  board.cast.forEach((c, i) => {
    parts.push(dataUrlPart(c.image));
    lines.push(`Picture ${i + 1} is "${c.name}". When ${c.name} is in the scene, keep exactly this look (shape, colours, fur, face, clothes).`);
  });
  if (previous?.image) {
    parts.push(dataUrlPart(previous.image));
    lines.push(
      `Picture ${board.cast.length + 1} is the key picture of the scene before. Keep the same characters' looks, and the same place and light where the story stays there.`
    );
  }
  if (board.story.trim()) lines.push(`The whole story, for context: ${board.story.trim()}`);
  lines.push(`THIS PICTURE: ${scene.picture.trim()}`);
  parts.push({ text: lines.join('\n') });

  const res = await generateContent({
    model: PICTURE_MODELS[board.model].id,
    contents: [{ role: 'user', parts }],
    config: { responseModalities: ['TEXT', 'IMAGE'], imageConfig: { aspectRatio: board.aspectRatio } } as any,
  });
  const part = (res.candidates?.[0]?.content?.parts || []).find((p: any) => p?.inlineData?.data);
  if (!part) {
    const reason = res.candidates?.[0]?.finishReason || res.raw?.promptFeedback?.blockReason;
    throw new Error(reason ? `No picture this time (${reason}). Change the text a little and try again.` : 'No picture this time. Try again.');
  }
  return `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
}

/** "Make with Gemini" for a character, prop or place: one picture of it alone, plain background. */
export async function makeCastPicture(opts: { name: string; description: string; model: PictureModel; others: BoardCast[] }): Promise<string> {
  const parts: any[] = [];
  const lines = [
    `Make a reference picture of "${opts.name}" for a children's film with plush toy characters: ${opts.description.trim()}`,
    'Show it alone, whole, centred, from the front at eye level, on a plain soft neutral background. Photographic look of a real plush toy or real object. No text.',
  ];
  opts.others.forEach((c, i) => {
    parts.push(dataUrlPart(c.image));
    lines.push(`Picture ${i + 1} is "${c.name}" from the same film: match its style and scale.`);
  });
  parts.push({ text: lines.join('\n') });
  const res = await generateContent({
    model: PICTURE_MODELS[opts.model].id,
    contents: [{ role: 'user', parts }],
    config: { responseModalities: ['TEXT', 'IMAGE'], imageConfig: { aspectRatio: '1:1' } } as any,
  });
  const part = (res.candidates?.[0]?.content?.parts || []).find((p: any) => p?.inlineData?.data);
  if (!part) throw new Error('No picture this time. Try again.');
  return `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
}

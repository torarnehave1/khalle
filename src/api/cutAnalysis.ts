/**
 * Look at the frames around a cut and suggest the scene that should go there.
 * One cheap text-model call (gemini.vegvisr.org /v1/generate) with one or two JPEG frames.
 */
import { generateContent, Type } from './gemini';

export type CutAnalysis = {
  startState: string;
  endState?: string;
  suggestedPrompt: string;
};

const dataUrlToPart = (dataUrl: string) => {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) throw new Error('The grabbed frame is not a data URL.');
  return { inlineData: { mimeType: match[1], data: match[2] } };
};

export async function analyzeCut(opts: {
  startFrame: string;
  endFrame?: string | null;
  previousPrompt?: string;
  nextPrompt?: string;
  wish?: string;
}): Promise<CutAnalysis> {
  const { startFrame, endFrame, previousPrompt, nextPrompt, wish } = opts;
  const parts: any[] = [
    { text: 'FRAME A — the last frame before the new scene:' },
    dataUrlToPart(startFrame),
  ];
  if (endFrame) {
    parts.push({ text: 'FRAME B — the first frame of the scene that comes after the new scene:' }, dataUrlToPart(endFrame));
  }
  parts.push({
    text: [
      'You are the continuity editor for a short animated film starring a green plush rabbit.',
      'A new 5-second scene will be generated that starts exactly on FRAME A' +
        (endFrame ? ' and ends on FRAME B, so the film plays without a jump.' : '.'),
      previousPrompt ? `The scene before was made from this prompt: "${previousPrompt}".` : '',
      nextPrompt ? `The scene after was made from this prompt: "${nextPrompt}".` : '',
      wish ? `The director wants this in the new scene: "${wish}".` : '',
      'Describe what you see in FRAME A' + (endFrame ? ' and FRAME B' : '') +
        ' (pose, position in frame, direction of movement, camera framing, lighting), then write one motion prompt ' +
        'for the new scene: concrete physical action, camera, and how it gets from A' + (endFrame ? ' to B' : ' onward') +
        '. Keep the prompt under 60 words. Do not mention frame letters or filenames in the prompt.',
    ]
      .filter(Boolean)
      .join('\n'),
  });

  const res = await generateContent({
    model: 'gemini-3.8-flash',
    contents: [{ role: 'user', parts }],
    config: {
      temperature: 0.4,
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          startState: { type: Type.STRING },
          endState: { type: Type.STRING },
          suggestedPrompt: { type: Type.STRING },
        },
        required: ['startState', 'suggestedPrompt'],
      },
    },
  });

  let parsed: any;
  try {
    parsed = JSON.parse(res.text || '{}');
  } catch {
    throw new Error('The frame analysis came back in an unexpected format. Try again.');
  }
  if (!parsed?.suggestedPrompt) throw new Error('The frame analysis returned no prompt. Try again.');
  return parsed as CutAnalysis;
}

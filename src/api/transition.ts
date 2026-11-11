/**
 * Transition clip between two scenes, with Gemini's first-and-last-frame interpolation
 * (gemini-omni-1.2-flash, Interactions API).
 *
 * Google's format: two images in `input` — the first is the start frame, the second the end
 * frame (by position; there is no role field) — then a text part describing the transition.
 * Interpolation allows 3–10 seconds; over 10 s is an invalid-argument error.
 */
import { getGeminiClient } from './gemini';

export const TRANSITION_MIN_SECONDS = 3;
export const TRANSITION_MAX_SECONDS = 10;

export const DEFAULT_TRANSITION_PROMPT =
  'One smooth, continuous shot with no cuts and no fades. The characters move naturally from their poses ' +
  'and positions in the first frame to their poses and positions in the last frame. Keep the same characters, style ' +
  'and lighting throughout; the camera glides smoothly between the two framings.';

/** For a new scene placed before another: it starts on a picture and ends on that scene's first frame. */
export const DEFAULT_BEFORE_PROMPT =
  'One smooth, continuous shot with no cuts and no fades. The characters start as in the first frame and ' +
  'move naturally until the shot ends exactly on the last frame. Keep the same characters, style and lighting throughout.';

const dataUrlParts = (dataUrl: string) => {
  const m = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!m) throw new Error('A transition frame is not a data URL.');
  return { mime_type: m[1], data: m[2] };
};

export async function generateTransition(opts: {
  firstFrame: string;
  lastFrame: string;
  prompt: string;
  seconds: number;
  aspectRatio: '9:16' | '16:9';
  resolution?: '360p' | '720p' | '1080p';
}): Promise<{ videoUrl: string; interactionId: string; duration: string }> {
  const seconds = Math.min(TRANSITION_MAX_SECONDS, Math.max(TRANSITION_MIN_SECONDS, Math.round(opts.seconds)));
  const duration = `${seconds}s`;
  const first = dataUrlParts(opts.firstFrame);
  const last = dataUrlParts(opts.lastFrame);

  const interaction: any = await getGeminiClient().interactions.create(
    {
      model: 'gemini-omni-1.2-flash',
      input: [
        { type: 'image', data: first.data, mime_type: first.mime_type },
        { type: 'image', data: last.data, mime_type: last.mime_type },
        { type: 'text', text: opts.prompt.trim() || DEFAULT_TRANSITION_PROMPT },
      ],
      background: false,
      store: true,
      stream: false,
      response_format: {
        type: 'video',
        aspect_ratio: opts.aspectRatio,
        duration,
        resolution: opts.resolution || '720p',
      },
    },
    { timeout: 300000 }
  );

  // Same places the animate route looks: output_video, else a video part in the model's steps.
  let data: string | undefined = interaction.output_video?.data;
  let mime: string = interaction.output_video?.mime_type || 'video/mp4';
  let uri: string | undefined = interaction.output_video?.uri;
  if (!data && !uri && Array.isArray(interaction.steps)) {
    for (const step of interaction.steps) {
      const vid = step?.content?.find?.((c: any) => c.type === 'video');
      if (vid) {
        data = vid.data || data;
        mime = vid.mime_type || mime;
        uri = vid.uri || uri;
      }
    }
  }
  if (!data && !uri) throw new Error('The model finished but returned no video for the transition.');
  return { videoUrl: data ? `data:${mime};base64,${data}` : uri!, interactionId: interaction.id, duration };
}

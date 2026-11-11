/**
 * The text Gemini gets with a new scene or a continuation (decision 2026-11-11, B: short + preview).
 *
 * Google's guide for gemini-omni-1.2-flash: no system instructions or negative-prompt field, so
 * every line competes with the scene text; "simple prompts work best"; describe what each picture is
 * for in plain words; ask for a single continuous shot. So:
 *  1. The user's scene text comes first, as typed.
 *  2. "In a single continuous shot, with no scene cuts."
 *  3. One plain line per picture, saying what it is for.
 *  4. One short line each for clothes, props, friends, season and weather, talking, sound.
 * The same text is shown in "What Gemini gets" before anything is sent, and can be edited there
 * (the edited text is sent as `promptOverride`, word for word).
 */
import type { ResolvedImage } from './references';

const SEASON: Record<string, string> = { spring: 'spring', summer: 'summer', autumn: 'autumn', winter: 'winter' };
const WEATHER: Record<string, string> = {
  sunny: 'clear and sunny',
  snowing: 'gentle snowfall',
  rain: 'gentle rain',
  sunset: 'golden sunset light',
  misty: 'soft morning mist',
  rainbow: 'a rainbow after rain',
};

const KHALLE_LOOK =
  'Khalle, a green plush rabbit with tall upright ears, one white buck tooth, a light-pink snout, a pink scarf and a pink belly patch';

type Kind = 'video' | 'continuation';

/** What one picture is for, in one plain sentence. */
function pictureLine(img: ResolvedImage, n: number, body: any, main: string): string {
  const role = `${img.role || ''}`;
  const src = `${img.source || ''}`;
  const label = (img.label || '').trim();
  if (src === 'start_picture' || /CONTINUITY START FRAME/i.test(role)) {
    return `Picture ${n} is the first frame: the video opens exactly on it and goes on from there.`;
  }
  if (/CONTINUITY END FRAME/i.test(role)) return `Picture ${n} is where the video ends: the last frame matches it.`;
  if (/^MAIN CHARACTER/i.test(role)) {
    return `Picture ${n} shows ${main}, the main character: keep this exact look. ${main === 'the main character' ? 'It' : main} appears once.`;
  }
  if (/^SCENE REFERENCE/i.test(role)) {
    const what = role.replace(/^SCENE REFERENCE:\s*/i, '').trim() || 'the wider view of the scene';
    // A story board character, prop or place: "<name> (keep exactly this look)".
    const kept = what.match(/^(.*?)\s*\(keep exactly this look\)\s*$/i);
    if (kept) return `Picture ${n} shows ${kept[1] || 'a character'}: keep this exact look.`;
    const shown = /^(the|a|an) /i.test(what) ? what.charAt(0).toLowerCase() + what.slice(1) : what;
    return `Picture ${n} shows ${shown}. Use it for the place, the light and how the characters look; what they do comes from the first lines.`;
  }
  if (/start(ing)? chest emblem/i.test(role)) return `Picture ${n} is the symbol on Khalle's belly patch at the start of the shot.`;
  if (/end(ing)? chest emblem/i.test(role)) return `Picture ${n} is the symbol on Khalle's belly patch at the end of the shot.`;
  if (/chest emblem|emblem/i.test(role) || /emblem|medallion/.test(src)) {
    return `Picture ${n} is the symbol on Khalle's belly patch: keep it exactly like this, still, for the whole shot.`;
  }
  if (/hero character|facial features|plush rabbit doll/i.test(role) || /preset_character|preset_face/.test(src)) {
    return `Picture ${n} shows Khalle: keep this exact look.`;
  }
  if (/COMPANION/i.test(role)) return `Picture ${n} shows ${label || 'a friend'}, a friend in the scene: keep this exact look.`;
  if (/TARGET PICTURE/i.test(role)) return `Picture ${n} is the picture ${main} holds and looks at: show this exact artwork on it.`;
  if (/^PROP/i.test(role)) return `Picture ${n} shows ${label || 'a prop'}, which is in the scene.`;
  if (/^CLOTHING|^COSTUME|^OUTFIT/i.test(role)) return `Picture ${n} shows ${label || 'clothing'} that ${main} wears.`;
  return `Picture ${n}: ${label || role || 'a reference picture'}.`;
}

const asList = (v: unknown): string[] =>
  (Array.isArray(v) ? v : v ? [v] : [])
    .map((d: any) => (typeof d === 'string' ? d : d?.directive || d?.title || ''))
    .map((s: string) => s.trim())
    .filter(Boolean);

export type PromptPicture = { n: number; line: string; previewUrl?: string; filename: string };

/** Builds the short text, plus one line per picture for the preview. */
export function buildShortPrompt(
  body: any,
  images: ResolvedImage[],
  kind: Kind,
  sceneText: string
): { text: string; pictures: PromptPicture[] } {
  const khalle = body?.includeKhalle !== false;
  const castName = typeof body?.castName === 'string' ? body.castName.trim() : '';
  const main = khalle ? 'Khalle' : castName || 'the main character';
  const lines: string[] = [];

  // 1. The scene text, as typed (picture file names become "Picture N").
  let text = sceneText.trim();
  images.forEach((img, i) => {
    const stem = (img.filename || '').replace(/\.[^.]+$/, '');
    if (stem.length >= 3) text = text.split(img.filename).join(`Picture ${i + 1}`).split(stem).join(`Picture ${i + 1}`);
  });
  lines.push(text);

  // 2. One shot.
  lines.push(
    kind === 'continuation'
      ? 'This continues the previous video in a single continuous shot, with no scene cuts.'
      : 'In a single continuous shot, with no scene cuts.'
  );

  // 3. Who is in it.
  if (khalle) {
    const belly =
      body?.customEmblemType === 'none'
        ? 'The belly patch is plain, with no symbol.'
        : images.some((im) => /start(ing)? chest emblem/i.test(im.role || ''))
        ? 'During the shot the belly symbol slowly changes from the start symbol to the end symbol.'
        : '';
    lines.push(`The main character is ${KHALLE_LOOK}. ${belly}`.trim());
  } else if (castName && typeof body?.castDescription === 'string' && body.castDescription.trim()) {
    lines.push(`The main character is ${castName}: ${body.castDescription.trim()}`);
  }

  // 4. The pictures.
  const pictures = images.map((img, i) => ({
    n: i + 1,
    line: pictureLine(img, i + 1, body, main),
    previewUrl: img.previewUrl,
    filename: img.filename,
  }));
  lines.push(...pictures.map((p) => p.line));
  if (!khalle) lines.push('Only the characters in the pictures and in the text are in the video.');

  // 5. Clothes, props, friends (from More options).
  const clothes = asList(body?.clothingDirectives).concat(asList(body?.clothingDirective));
  if (clothes.length) lines.push(`${main} wears: ${Array.from(new Set(clothes)).join('; ')}.`);
  const props = asList(body?.propDirectives).concat(asList(body?.shootGuideDirective));
  if (props.length) lines.push(`Also in the scene: ${Array.from(new Set(props)).join('; ')}.`);
  const friends = asList(body?.characterDirectives).concat(asList(body?.characterDirective));
  if (friends.length) lines.push(`Friends in the scene: ${Array.from(new Set(friends)).join('; ')}.`);

  // 6. Season and weather (the text wins).
  const s = SEASON[body?.season];
  const w = WEATHER[body?.weather];
  if (s || w) lines.push(`Season and weather: ${[s, w].filter(Boolean).join(', ')}, unless the text above says otherwise.`);

  // 7. Talking and sound.
  const talk = body?.silentTalk === true;
  if (talk) lines.push(`While doing this, ${main} moves the mouth as if talking, with no audible words (a voice is added later).`);
  const audio = body?.audioMode || 'with_sound';
  if (audio === 'silent') lines.push('No sound.');
  else if (audio === 'no_voices' || talk) lines.push('Sound: only the sounds of the place and of the actions. No voices, speech, singing or narration.');
  else lines.push('Sound: the sounds of the place and of the actions.');

  return { text: lines.filter(Boolean).join('\n'), pictures };
}

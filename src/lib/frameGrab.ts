/**
 * Grab one frame of a clip as a JPEG data URL, in the browser (no ffmpeg needed).
 * `at` is seconds into the clip; Infinity or a value past the end means "the last frame".
 */
export async function grabFrame(videoUrl: string, at: number, maxSide = 1280): Promise<string> {
  const v = document.createElement('video');
  v.muted = true;
  v.playsInline = true;
  v.preload = 'auto';
  v.crossOrigin = 'anonymous';
  v.src = videoUrl;

  await new Promise<void>((resolve, reject) => {
    v.onloadedmetadata = () => resolve();
    v.onerror = () => reject(new Error('The clip could not be read to grab a frame.'));
  });

  const duration = Number.isFinite(v.duration) ? v.duration : 0;
  // The very last timestamp often has no decodable frame; step back one frame (~1/30 s).
  const target = Math.max(0, Math.min(at, duration - 0.04));

  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Timed out seeking the clip to grab a frame.')), 10000);
    v.onseeked = () => {
      clearTimeout(timer);
      resolve();
    };
    v.currentTime = target;
  });

  const scale = Math.min(1, maxSide / Math.max(v.videoWidth, v.videoHeight));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(v.videoWidth * scale);
  canvas.height = Math.round(v.videoHeight * scale);
  const ctx = canvas.getContext('2d');
  if (!ctx || !canvas.width) throw new Error('The clip has no video frame to grab.');
  ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
  const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
  v.removeAttribute('src');
  v.load();
  return dataUrl;
}

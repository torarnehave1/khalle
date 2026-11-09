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

/**
 * Small thumbnails along a clip for a timeline strip. One hidden video element, seeked in turn.
 * Returns data URLs in the order of `times`; a frame that fails is an empty string.
 */
export async function grabThumbnails(videoUrl: string, times: number[], height = 72): Promise<string[]> {
  const v = document.createElement('video');
  v.muted = true;
  v.playsInline = true;
  v.preload = 'auto';
  v.crossOrigin = 'anonymous';
  v.src = videoUrl;
  await new Promise<void>((resolve, reject) => {
    v.onloadedmetadata = () => resolve();
    v.onerror = () => reject(new Error('The clip could not be read for thumbnails.'));
  });
  // Wait for decoded data, or the first seek can complete before any frame is drawable (black thumb).
  if (v.readyState < 2) {
    await new Promise<void>((resolve) => {
      v.onloadeddata = () => resolve();
      setTimeout(resolve, 3000);
    });
  }
  const scale = height / Math.max(1, v.videoHeight);
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(v.videoWidth * scale));
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  const out: string[] = [];
  const last = Number.isFinite(v.duration) ? Math.max(0, v.duration - 0.04) : Infinity;
  for (const t of times) {
    try {
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('seek timeout')), 5000);
        v.onseeked = () => {
          clearTimeout(timer);
          resolve();
        };
        v.currentTime = Math.min(t, last);
      });
      ctx?.drawImage(v, 0, 0, canvas.width, canvas.height);
      out.push(canvas.toDataURL('image/jpeg', 0.7));
    } catch {
      out.push('');
    }
  }
  v.removeAttribute('src');
  v.load();
  return out;
}

/** Length of a clip in seconds, read from its metadata. */
export async function clipDuration(videoUrl: string): Promise<number> {
  const v = document.createElement('video');
  v.muted = true;
  v.preload = 'metadata';
  v.crossOrigin = 'anonymous';
  v.src = videoUrl;
  try {
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Timed out reading the clip length.')), 20000);
      v.onloadedmetadata = () => {
        clearTimeout(timer);
        resolve();
      };
      v.onerror = () => {
        clearTimeout(timer);
        reject(new Error('The clip could not be read.'));
      };
    });
    return Number.isFinite(v.duration) ? v.duration : NaN;
  } finally {
    v.removeAttribute('src');
    v.load();
  }
}

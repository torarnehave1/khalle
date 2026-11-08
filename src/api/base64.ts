/** Browser stand-ins for the Node `Buffer` base64 calls server.ts made. */

/** Bytes → base64 (Buffer.from(bytes).toString('base64')). Chunked so large images don't overflow the call stack. */
export function bytesToBase64(input: ArrayBuffer | Uint8Array): string {
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunk)));
  }
  return btoa(binary);
}

/** Decoded byte length of a base64 string (Buffer.from(b64, 'base64').length), without decoding it. */
export function base64ByteLength(b64: string): number {
  if (!b64) return 0;
  const clean = b64.replace(/[^A-Za-z0-9+/=_-]/g, '');
  const padding = clean.endsWith('==') ? 2 : clean.endsWith('=') ? 1 : 0;
  return Math.max(0, Math.floor((clean.length * 3) / 4) - padding);
}

/** path.basename for URL/file paths ('/a/b/c.png' → 'c.png'). */
export function basename(p: string): string {
  const trimmed = p.replace(/\/+$/, '');
  const idx = trimmed.lastIndexOf('/');
  return idx === -1 ? trimmed : trimmed.slice(idx + 1);
}

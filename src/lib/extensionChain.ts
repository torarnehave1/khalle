/** Gemini's limit for one chain of extensions: the first clip plus all extensions, in seconds. */
export const MAX_EXTENSION_CHAIN_SECONDS = 30;

type ChainScene = { id: string; duration?: string; interactionId?: string; previousInteractionId?: string };

/**
 * Seconds already used in the chain that `parent` ends: its own clip plus every scene it continues,
 * followed back through previousInteractionId. Past 30 s Gemini fails with INVALID_ARGUMENT.
 */
export function extensionChainSeconds(parent: ChainScene, history: ChainScene[]): number {
  let total = 0;
  let scene: ChainScene | undefined = parent;
  const seen = new Set<string>();
  while (scene && !seen.has(scene.id)) {
    seen.add(scene.id);
    total += parseInt(String(scene.duration || '0'), 10) || 0;
    const prevId: string | undefined = scene.previousInteractionId;
    scene = prevId ? history.find((v) => v.interactionId === prevId) : undefined;
  }
  return total;
}

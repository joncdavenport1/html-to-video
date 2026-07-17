/**
 * Scale source to fill target, crop centered.
 * @returns {{ vf: string, extraInputs: string[] }}
 */
export function coverFilter(srcW, srcH, dstW, dstH) {
  return {
    vf: `scale=${dstW}:${dstH}:force_original_aspect_ratio=increase,crop=${dstW}:${dstH}`,
    extraInputs: [],
  };
}

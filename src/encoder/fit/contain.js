/**
 * Letterbox source onto target canvas; fill empty space with bgColor.
 * @returns {{ vf: string, extraInputs: string[] }}
 */
export function containFilter(srcW, srcH, dstW, dstH, bgColor) {
  const color = bgColor.replace('#', '0x');
  return {
    vf: `scale=${dstW}:${dstH}:force_original_aspect_ratio=decrease,` +
        `pad=${dstW}:${dstH}:(ow-iw)/2:(oh-ih)/2:color=${color}`,
    extraInputs: [],
  };
}

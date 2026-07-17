/**
 * Source already matches target aspect — scale (or copy) only.
 * @returns {{ vf: string, extraInputs: string[] }}
 */
export function passFilter(srcW, srcH, dstW, dstH) {
  const vf = (srcW === dstW && srcH === dstH) ? 'copy' : `scale=${dstW}:${dstH}`;
  return { vf, extraInputs: [] };
}

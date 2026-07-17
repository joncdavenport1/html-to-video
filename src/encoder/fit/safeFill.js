/**
 * Letterbox + composite a logo image in the empty zone.
 * Falls back to plain contain if there is no empty zone (source already fills target).
 *
 * @param {number} srcW
 * @param {number} srcH
 * @param {number} dstW
 * @param {number} dstH
 * @param {string} bgColor   - hex e.g. '#111316'
 * @param {string} logoPath  - absolute path to a raster logo (PNG); comes from the
 *                             project's safeFillLogo setting
 * @returns {{ vf: string, extraInputs: string[] }}
 */
export function safeFillFilter(srcW, srcH, dstW, dstH, bgColor, logoPath) {
  const color = bgColor.replace('#', '0x');

  // How the source scales to fit inside the target
  const scale   = Math.min(dstW / srcW, dstH / srcH);
  const fitW    = Math.round(srcW * scale);
  const fitH    = Math.round(srcH * scale);

  const emptyW  = dstW - fitW;
  const emptyH  = dstH - fitH;

  // No meaningful empty zone — behave like contain
  if (emptyW < 40 && emptyH < 40) {
    return {
      vf: `scale=${dstW}:${dstH}:force_original_aspect_ratio=decrease,` +
          `pad=${dstW}:${dstH}:(ow-iw)/2:(oh-ih)/2:color=${color}`,
      extraInputs: [],
    };
  }

  // Letterboxed top/bottom (common: 16:9 source → 9:16 target)
  if (emptyH > emptyW) {
    const zoneH  = Math.round(emptyH / 2);
    const logoH  = Math.round(zoneH * 0.84);   // 8% pad top + bottom of zone
    const logoY  = Math.round(zoneH * 0.08);

    return {
      vf: `[0:v]scale=${dstW}:${dstH}:force_original_aspect_ratio=decrease,` +
          `pad=${dstW}:${dstH}:(ow-iw)/2:(oh-ih)/2:color=${color}[bg];` +
          `[1:v]scale=${dstW}:${logoH}:force_original_aspect_ratio=decrease[logo];` +
          `[bg][logo]overlay=(${dstW}-overlay_w)/2:${logoY}`,
      extraInputs: [logoPath],
    };
  }

  // Pillarboxed left/right (rare: portrait source → landscape target)
  const zoneW  = Math.round(emptyW / 2);
  const logoW  = Math.round(zoneW * 0.84);
  const logoX  = Math.round(zoneW * 0.08);

  return {
    vf: `[0:v]scale=${dstW}:${dstH}:force_original_aspect_ratio=decrease,` +
        `pad=${dstW}:${dstH}:(ow-iw)/2:(oh-ih)/2:color=${color}[bg];` +
        `[1:v]scale=${logoW}:${dstH}:force_original_aspect_ratio=decrease[logo];` +
        `[bg][logo]overlay=${logoX}:(${dstH}-overlay_h)/2`,
    extraInputs: [logoPath],
  };
}

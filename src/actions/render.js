import pLimit   from 'p-limit';
import os        from 'node:os';
import path      from 'node:path';
import { getPreset }                                         from '../encoder/presets.js';
import { loadProject, getAnimation, expandHome }             from '../project.js';
import { captureFrames }                                     from '../recorder/capture.js';
import { encode }                                            from '../encoder/ffmpeg.js';
import { computeSourceHash, getCachedFramesDir, getFramesDir, gcOldCache } from '../cache.js';
import { log, spinner }                                      from '../log.js';

function presetFolder(preset) {
  const pretty = preset.name
    .split('-')
    .map(s => s === '4k' ? '4K' : s[0].toUpperCase() + s.slice(1))
    .join(' ');
  return `${pretty} (${preset.width}x${preset.height})`;
}

/**
 * Render one animation to one or more presets.
 *
 * @param {string}   animationName
 * @param {string[]} presetNames
 * @param {object}   options
 */
export async function render(animationName, presetNames, options = {}) {
  const project   = loadProject();
  const animation = getAnimation(animationName);
  const presets   = presetNames.map(n => getPreset(n));

  const outRoot = options.out ? path.resolve(expandHome(options.out)) : project.output;

  if (options.dryRun) {
    log.info(`Dry run: "${animation.name}" → ${presetNames.join(', ')}`);
    log.muted(`  Duration: ${animation.duration}s  |  Native: ${animation.nativeWidth}×${animation.nativeHeight}`);
    for (const p of presets) {
      const fps = options.fps ? parseInt(options.fps) : p.fps;
      const fit = options.fit || p.defaultFit;
      log.muted(`  [${p.name}]  ${p.width}×${p.height}  ${fps}fps  fit:${fit}`);
    }
    log.muted(`  Output: ${outRoot}/`);
    return;
  }

  log.info(`Rendering "${animation.name}" — ${presets.length} preset${presets.length !== 1 ? 's' : ''}.`);

  // Source-hash cache
  const sourceHash  = await computeSourceHash(project.root, animation.file);
  let   framesDir   = null;

  if (options.cache !== false) {
    framesDir = await getCachedFramesDir(project.root, animation.id, sourceHash);
    if (framesDir) log.muted(`  Using cached frames (${sourceHash.slice(0, 8)}…)`);
  }

  if (!framesDir) {
    const captureFps = options.fps ? parseInt(options.fps) : presets[0].fps;
    framesDir        = await getFramesDir(project.root, animation.id, sourceHash);

    const spin = spinner(`Capturing frames…`).start();
    try {
      const n = await captureFrames({
        projectRoot:   project.root,
        animationFile: animation.file,
        duration:      animation.duration,
        fps:           captureFps,
        width:         animation.nativeWidth,
        height:        animation.nativeHeight,
        framesDir,
        hideSelectors: project.hideSelectors,
        alpha:         options.alpha,
        verbose:       options.verbose,
      });
      spin.succeed(`Captured ${n} frames.`);
    } catch (err) {
      spin.fail(`Capture failed: ${err.message}`);
      throw err;
    }
    await gcOldCache(project.root, animation.id);
  }

  // Encode all presets in parallel
  const maxConcurrent = options.parallel ? parseInt(options.parallel) : os.cpus().length;
  const limit         = pLimit(maxConcurrent);
  const renders       = [];
  const errors        = [];

  await Promise.all(presets.map(preset => limit(async () => {
    const fps      = options.fps ? parseInt(options.fps) : preset.fps;
    const fit      = options.fit || preset.defaultFit;
    const presetDir = path.join(outRoot, presetFolder(preset));
    const ext      = options.alpha ? 'mov' : preset.container;
    const outFile  = path.join(presetDir, `${animation.name}.${ext}`);

    const spin = spinner(`Encoding ${preset.name}…`).start();
    try {
      const result = await encode({
        framesDir,
        fps,
        srcWidth:  animation.nativeWidth,
        srcHeight: animation.nativeHeight,
        preset,
        animation,
        fit,
        outputPath: outFile,
        logoPath:   project.safeFillLogo,
        alpha:      options.alpha,
        verbose:    options.verbose,
      });
      spin.succeed(`${preset.name}  →  ${preset.width}×${preset.height}`);
      renders.push(result);
    } catch (err) {
      spin.fail(`${preset.name} failed: ${err.message}`);
      errors.push(err);
    }
  })));

  if (errors.length) throw new Error(`${errors.length} encode(s) failed.`);

  log.success(`Done. ${renders.length} file${renders.length !== 1 ? 's' : ''} written to ${outRoot}/.`);
  return renders;
}

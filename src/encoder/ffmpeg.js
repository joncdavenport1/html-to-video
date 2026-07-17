import { spawn }      from 'node:child_process';
import fs              from 'node:fs/promises';
import { existsSync }  from 'node:fs';
import path            from 'node:path';
import { containFilter } from './fit/contain.js';
import { coverFilter }   from './fit/cover.js';
import { passFilter }    from './fit/pass.js';
import { safeFillFilter } from './fit/safeFill.js';

/**
 * Encode a PNG frame sequence to a video file.
 *
 * @param {object} opts
 * @param {string}  opts.framesDir  - absolute path to the frames/ directory
 * @param {number}  opts.fps        - frames per second
 * @param {number}  opts.srcWidth   - native source width
 * @param {number}  opts.srcHeight  - native source height
 * @param {object}  opts.preset     - preset spec object
 * @param {object}  opts.animation  - animation spec object
 * @param {string}  opts.fit        - 'contain' | 'cover' | 'safe-fill' | 'pass'
 * @param {string}  opts.outputPath - absolute path for the output video
 * @param {string}  [opts.logoPath] - absolute path to the safe-fill logo image
 * @param {boolean} [opts.alpha]
 * @param {boolean} [opts.verbose]
 * @returns {Promise<object>}       - render metadata
 */
export async function encode({ framesDir, fps, srcWidth, srcHeight, preset, animation, fit, outputPath, logoPath = null, alpha = false, verbose = false }) {
  await fs.mkdir(path.dirname(outputPath), { recursive: true });

  const isProRes = preset.codec === 'prores_4444' || alpha;
  const { vf, extraInputs } = buildFilter(fit, srcWidth, srcHeight, preset.width, preset.height, animation.background, isProRes, logoPath);

  const args = buildArgs({ framesDir, fps, extraInputs, vf, preset, outputPath, isProRes });

  if (verbose) console.log(`  ffmpeg ${args.join(' ')}`);

  await spawnFfmpeg(args, outputPath);

  const { size: bytes } = await fs.stat(outputPath);
  const rel = path.relative(process.cwd(), outputPath);

  return {
    preset:      preset.name,
    fit,
    width:       preset.width,
    height:      preset.height,
    fps,
    duration:    animation.duration,
    path:        rel,
    bytes,
    renderedAt:  new Date().toISOString(),
  };
}

function buildFilter(fit, srcW, srcH, dstW, dstH, bgColor, isProRes, logoPath) {
  if (isProRes) {
    // ProRes 4444 — no aspect transform needed, pass through
    return passFilter(srcW, srcH, dstW, dstH);
  }
  switch (fit) {
    case 'cover':     return coverFilter(srcW, srcH, dstW, dstH);
    case 'safe-fill': return safeFillFilter(srcW, srcH, dstW, dstH, bgColor, requireLogo(logoPath));
    case 'pass':      return passFilter(srcW, srcH, dstW, dstH);
    case 'contain':
    default:          return containFilter(srcW, srcH, dstW, dstH, bgColor);
  }
}

function requireLogo(logoPath) {
  if (!logoPath) {
    throw new Error(
      'Fit mode "safe-fill" composites a logo into the letterbox bars, but no logo is set.\n' +
      `  Add "safeFillLogo": "path/to/logo.png" to your animations.json.`
    );
  }
  if (!existsSync(logoPath)) {
    throw new Error(`safeFillLogo does not exist: ${logoPath}`);
  }
  return logoPath;
}

function buildArgs({ framesDir, fps, extraInputs, vf, preset, outputPath, isProRes }) {
  const args = [
    '-framerate', String(fps),
    '-i', path.join(framesDir, '%06d.png'),
  ];

  for (const inp of extraInputs) {
    args.push('-i', inp);
  }

  if (isProRes) {
    args.push(
      '-c:v',        'prores_ks',
      '-profile:v',  '4444',
      '-pix_fmt',    'yuva444p10le',
    );
  } else {
    args.push(
      '-c:v',        'libx264',
      '-pix_fmt',    preset.pixelFormat || 'yuv420p',
      '-profile:v',  'high',
      '-level',      '4.2',
      '-crf',        preset.width >= 3840 ? '16' : '18',
      '-preset',     'slow',
      '-movflags',   '+faststart',
      '-an',
    );
    if (preset.bitrate) args.push('-maxrate', preset.bitrate, '-bufsize', String(parseInt(preset.bitrate) * 2) + 'M');
  }

  // Only add -vf if it's not a plain 'copy'
  if (vf !== 'copy') {
    // Safe to use -filter_complex for multi-input graphs (safe-fill), plain -vf otherwise
    if (extraInputs.length > 0) {
      args.push('-filter_complex', vf);
    } else {
      args.push('-vf', vf);
    }
  }

  args.push('-y', outputPath);
  return args;
}

function spawnFfmpeg(args, outputPath) {
  return new Promise((resolve, reject) => {
    const proc = spawn('ffmpeg', args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let stderr = '';
    proc.stderr.on('data', d => { stderr += d; });
    proc.on('close', async (code) => {
      if (code !== 0) {
        // Clean up partial output
        try { await fs.unlink(outputPath); } catch (_) {}
        reject(new Error(`ffmpeg exited ${code}:\n${stderr.slice(-1000)}`));
      } else {
        resolve();
      }
    });
    proc.on('error', (err) => reject(new Error(`ffmpeg spawn failed: ${err.message}`)));
  });
}

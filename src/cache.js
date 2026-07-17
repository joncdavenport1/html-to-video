import crypto       from 'node:crypto';
import fs            from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import path          from 'node:path';

const CACHE_DIRNAME = '.cache';

/** Every file under `dir`, recursively, as absolute paths in stable order. */
async function walk(dir) {
  let entries;
  try { entries = await fs.readdir(dir, { withFileTypes: true }); }
  catch (_) { return []; }

  const out = [];
  for (const e of [...entries].sort((a, b) => a.name.localeCompare(b.name))) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...await walk(p));
    else out.push(p);
  }
  return out;
}

/**
 * Hash the animation HTML plus every asset it could reference.
 *
 * A .dc.html file loads its runtime, styles, fonts and images by relative path
 * (./support.js, assets/…, _ds/…), so anything in its folder is a potential
 * dependency. Sibling .dc.html files are excluded — they can't affect this one.
 */
export async function computeSourceHash(projectRoot, animationFile) {
  const hash     = crypto.createHash('sha256');
  const htmlPath = path.resolve(projectRoot, animationFile);

  hash.update(readFileSync(htmlPath));

  for (const p of await walk(path.dirname(htmlPath))) {
    if (p === htmlPath || p.endsWith('.dc.html')) continue;
    hash.update(path.relative(projectRoot, p));
    hash.update(readFileSync(p));
  }

  return hash.digest('hex');
}

export async function getCachedFramesDir(projectRoot, animationId, sourceHash) {
  const dir = _framesPath(projectRoot, animationId, sourceHash);
  try {
    const entries = await fs.readdir(dir);
    if (entries.some(f => f.endsWith('.png'))) return dir;
  } catch (_) {}
  return null;
}

export async function getFramesDir(projectRoot, animationId, sourceHash) {
  const dir = _framesPath(projectRoot, animationId, sourceHash);
  // Start clean: frame files are zero-padded, so a shorter re-capture (e.g. a lower
  // --fps) would otherwise leave stale higher-numbered frames behind for ffmpeg to glob.
  await fs.rm(dir, { recursive: true, force: true });
  await fs.mkdir(dir, { recursive: true });
  return dir;
}

/** Keep only the 3 most recent hash directories for this animation. */
export async function gcOldCache(projectRoot, animationId) {
  const animDir = path.join(projectRoot, CACHE_DIRNAME, animationId);
  try {
    const entries = await fs.readdir(animDir, { withFileTypes: true });
    const dirs = entries.filter(e => e.isDirectory()).map(e => ({ name: e.name, mtime: 0 }));

    for (const d of dirs) {
      try { d.mtime = (await fs.stat(path.join(animDir, d.name))).mtimeMs; } catch (_) {}
    }

    dirs.sort((a, b) => b.mtime - a.mtime);
    for (const d of dirs.slice(3)) {
      await fs.rm(path.join(animDir, d.name), { recursive: true, force: true });
    }
  } catch (_) {}
}

function _framesPath(projectRoot, animationId, sourceHash) {
  return path.join(projectRoot, CACHE_DIRNAME, animationId, sourceHash, 'frames');
}

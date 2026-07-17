import { z }                     from 'zod';
import { existsSync, readFileSync } from 'node:fs';
import os                        from 'node:os';
import path                      from 'node:path';

export const CONFIG_NAME = 'animations.json';

const AnimationSchema = z.object({
  id:           z.string(),
  name:         z.string(),
  file:         z.string(),
  duration:     z.number(),
  nativeWidth:  z.number(),
  nativeHeight: z.number(),
  aspect:       z.string(),
  background:   z.string(),
  description:  z.string().optional(),
  primary:      z.boolean().optional(),
  tags:         z.array(z.string()).optional(),
});

const ProjectSchema = z.object({
  animations:    z.array(AnimationSchema).min(1),
  output:        z.string().optional(),
  safeFillLogo:  z.string().optional(),
  hideSelectors: z.array(z.string()).optional(),
});

/** Expand a leading ~ to the user's home directory. */
export function expandHome(p) {
  return p.startsWith('~') ? path.join(os.homedir(), p.slice(1)) : p;
}

/** Walk up from `from` looking for the nearest animations.json. */
export function findProjectRoot(from = process.cwd()) {
  let dir = path.resolve(from);
  for (;;) {
    if (existsSync(path.join(dir, CONFIG_NAME))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

let _project = null;

export function loadProject(from) {
  if (_project) return _project;

  const root = findProjectRoot(from);
  if (!root) {
    throw new Error(
      `No ${CONFIG_NAME} found here or in any parent folder.\n` +
      `  cd into a project folder, or run "html-to-video init" to create one.`
    );
  }

  const configPath = path.join(root, CONFIG_NAME);
  let raw;
  try {
    raw = JSON.parse(readFileSync(configPath, 'utf8'));
  } catch (err) {
    throw new Error(`${configPath} is not valid JSON — ${err.message}`);
  }

  const parsed = ProjectSchema.parse(raw);
  const outDir = parsed.output ? expandHome(parsed.output) : 'renders';

  _project = {
    root,
    configPath,
    animations:    parsed.animations,
    output:        path.resolve(root, outDir),
    safeFillLogo:  parsed.safeFillLogo ? path.resolve(root, expandHome(parsed.safeFillLogo)) : null,
    hideSelectors: parsed.hideSelectors ?? [],
  };
  return _project;
}

export function getAnimation(nameOrId, from) {
  const { animations } = loadProject(from);
  const needle = nameOrId.trim();
  const anim = animations.find(a =>
    a.name === needle ||
    a.id   === needle ||
    a.id   === needle.toLowerCase().replace(/\s+/g, '-').replace(/[()]/g, '')
  );
  if (!anim) {
    const available = animations.map(a => `"${a.name}"`).join(', ');
    throw new Error(`Unknown animation "${nameOrId}". Available: ${available}`);
  }
  return anim;
}

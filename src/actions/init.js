import fs   from 'node:fs/promises';
import path  from 'node:path';
import { fileURLToPath } from 'node:url';
import { CONFIG_NAME }   from '../project.js';
import { log }           from '../log.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TOOL_ROOT = path.resolve(__dirname, '../../');

/** Scaffold a new project folder from the bundled example. */
export async function init(dir = '.') {
  const target     = path.resolve(dir);
  const configPath = path.join(target, CONFIG_NAME);

  try {
    await fs.access(configPath);
    throw new Error(`${configPath} already exists — this is already a project folder.`);
  } catch (err) {
    if (err.code !== 'ENOENT') throw err;
  }

  await fs.mkdir(path.join(target, 'animations'), { recursive: true });

  await fs.cp(
    path.join(TOOL_ROOT, 'example', 'animations'),
    path.join(target, 'animations'),
    { recursive: true }
  );
  await fs.copyFile(path.join(TOOL_ROOT, 'example', CONFIG_NAME), configPath);
  await fs.writeFile(path.join(target, '.gitignore'), '.cache/\nrenders/\n');

  log.success(`Created a project in ${target}/`);
  log.muted(`  ${CONFIG_NAME}                     the registry — one entry per animation`);
  log.muted(`  animations/Hello Motion.dc.html   a starter animation`);
  log.muted(`\n  Next:  cd ${dir === '.' ? '.' : dir}  &&  html-to-video "Hello Motion" --preset hero`);
}

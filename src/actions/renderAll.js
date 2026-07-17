import { loadProject } from '../project.js';
import { render }      from './render.js';
import { log }         from '../log.js';

/**
 * Render every animation in the project's animations.json to the given presets.
 */
export async function renderAll(presetNames, options = {}) {
  const { animations } = loadProject();
  log.info(`Rendering all ${animations.length} animations — ${presetNames.join(', ')}.`);
  log.rule();

  const errors = [];
  for (const anim of animations) {
    try {
      await render(anim.name, presetNames, options);
    } catch (err) {
      log.err(`Failed: ${anim.name} — ${err.message}`);
      errors.push({ animation: anim.name, error: err });
    }
    log.rule();
  }

  if (errors.length) {
    log.err(`${errors.length} animation(s) failed.`);
    process.exitCode = 1;
  } else {
    log.success(`All ${animations.length} animations rendered.`);
  }
}

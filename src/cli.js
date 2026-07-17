import { Command } from 'commander';
import { render }    from './actions/render.js';
import { renderAll } from './actions/renderAll.js';
import { list }      from './actions/list.js';
import { info }      from './actions/info.js';
import { init }      from './actions/init.js';
import { log }       from './log.js';

function fatal(err) {
  log.err(err.message);
  process.exit(1);
}

// Pre-parse --list and --info before Commander so they work anywhere on the line
const rawArgs = process.argv.slice(2);
if (rawArgs.includes('--list') || rawArgs[0] === 'list') {
  try { list(); process.exit(0); } catch (err) { fatal(err); }
}
const infoIdx = rawArgs.indexOf('--info');
if (infoIdx !== -1) {
  const name = rawArgs[infoIdx + 1];
  if (!name || name.startsWith('-')) { log.err('--info requires an animation name.'); process.exit(1); }
  try { info(name); process.exit(0); } catch (err) { fatal(err); }
}

const program = new Command();

program
  .name('html-to-video')
  .description('Render HTML animations to broadcast-quality video at any aspect ratio.')
  .version('1.0.0')
  .addHelpCommand(false);

// ── html-to-video render <name> [options]  (default command) ───────────────
program
  .command('render <name>', { isDefault: true })
  .description('Render one animation to one or more presets.')
  .option('--preset <presets>',  'Comma-separated preset names.',           'hero')
  .option('--fit <mode>',        'Aspect-fit: contain | cover | safe-fill | pass')
  .option('--fps <n>',           'Override frames per second.')
  .option('--out <dir>',         'Output root directory (default: the project\'s "output" setting).')
  .option('--alpha',             'Output ProRes 4444 MOV with alpha.')
  .option('--no-cache',          'Force re-capture even if frames are cached.')
  .option('--parallel <n>',      'Max concurrent encodes (default: CPU count).')
  .option('--dry-run',           'Print plan without rendering.')
  .option('--quiet',             'Suppress progress output.')
  .option('--verbose',           'Show ffmpeg args and frame-capture details.')
  .action(async (name, opts) => {
    const presets = opts.preset.split(',').map(s => s.trim()).filter(Boolean);
    await render(name, presets, opts).catch(fatal);
  });

// ── html-to-video all [options] ────────────────────────────────────────────
program
  .command('all')
  .description('Render every animation in the project.')
  .option('--preset <presets>',  'Comma-separated preset names.',           'hero')
  .option('--fit <mode>',        'Aspect-fit: contain | cover | safe-fill | pass')
  .option('--fps <n>',           'Override frames per second.')
  .option('--out <dir>',         'Output root directory (default: the project\'s "output" setting).')
  .option('--alpha',             'Output ProRes 4444 MOV with alpha.')
  .option('--no-cache',          'Force re-capture.')
  .option('--parallel <n>',      'Max concurrent encodes.')
  .option('--dry-run',           'Print plan without rendering.')
  .option('--quiet',             'Suppress progress output.')
  .option('--verbose',           'Show detailed output.')
  .action(async (opts) => {
    const presets = opts.preset.split(',').map(s => s.trim()).filter(Boolean);
    await renderAll(presets, opts).catch(fatal);
  });

// ── html-to-video init [dir] ───────────────────────────────────────────────
program
  .command('init [dir]')
  .description('Create a new project folder here (animations.json + starter animation).')
  .action(async (dir) => {
    await init(dir).catch(fatal);
  });

program.parseAsync(process.argv);

import chalk from 'chalk';
import { loadPresets } from '../encoder/presets.js';
import { loadProject } from '../project.js';

const c = { accent: '#7CCDDF', muted: '#7F8C99', action: '#1449BD' };

export function list() {
  const { animations } = loadProject();
  const presets        = loadPresets();

  console.log('\n' + chalk.hex(c.accent).bold('Animations'));
  console.log(chalk.hex(c.muted)('──────────'));
  for (const a of animations) {
    const primary = a.primary ? chalk.hex(c.muted)('  (primary)') : '';
    const id   = chalk.hex(c.muted)(a.id.padEnd(26));
    const name = `"${a.name}"`.padEnd(34);
    const dur  = chalk.hex(c.accent)(`${a.duration}s`.padStart(6));
    const dim  = chalk.hex(c.muted)(`  ${a.nativeWidth}×${a.nativeHeight}`);
    console.log(`  ${id}${name}${dur}${dim}${primary}`);
  }

  console.log('\n' + chalk.hex(c.action).bold('Presets'));
  console.log(chalk.hex(c.muted)('───────'));
  for (const [key, p] of Object.entries(presets)) {
    const dim     = `${p.width}×${p.height}`.padEnd(12);
    const fps     = `${p.fps}fps`.padEnd(7);
    const bitrate = (p.bitrate || '—').padEnd(5);
    const codec   = p.codec.replace('prores_4444', 'prores').padEnd(7);
    const label   = chalk.hex(c.muted)(`  (${p.label})`);
    console.log(`  ${chalk.hex(c.accent)(key.padEnd(14))}${dim}${fps}${bitrate}${codec}${label}`);
  }
  console.log();
}

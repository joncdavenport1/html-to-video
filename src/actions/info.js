import chalk from 'chalk';
import { getAnimation } from '../project.js';

const c = { accent: '#7CCDDF', muted: '#7F8C99' };

export function info(nameOrId) {
  const anim = getAnimation(nameOrId);
  console.log();
  console.log(chalk.hex(c.accent).bold(anim.name));
  console.log(chalk.hex(c.muted)(`  ID:         ${anim.id}`));
  console.log(chalk.hex(c.muted)(`  File:       ${anim.file}`));
  console.log(chalk.hex(c.muted)(`  Duration:   ${anim.duration}s`));
  console.log(chalk.hex(c.muted)(`  Native:     ${anim.nativeWidth}×${anim.nativeHeight}  (${anim.aspect})`));
  console.log(chalk.hex(c.muted)(`  Background: ${anim.background}`));
  if (anim.tags?.length) console.log(chalk.hex(c.muted)(`  Tags:       ${anim.tags.join(', ')}`));
  if (anim.description) console.log(chalk.hex(c.muted)(`\n  ${anim.description}`));
  console.log();
}

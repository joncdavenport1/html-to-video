import chalk from 'chalk';
import ora from 'ora';

const c = {
  accent:  '#7CCDDF',
  action:  '#1449BD',
  success: '#3FACCA',
  warn:    '#E8B85B',
  err:     '#D4574A',
  muted:   '#7F8C99',
};

export const log = {
  info:    (msg) => console.log(chalk.hex(c.accent)(msg)),
  success: (msg) => console.log(chalk.hex(c.success)(msg)),
  warn:    (msg) => console.log(chalk.hex(c.warn)(msg)),
  err:     (msg) => console.error(chalk.hex(c.err)(msg)),
  muted:   (msg) => console.log(chalk.hex(c.muted)(msg)),
  plain:   (msg) => console.log(msg),
  rule:    ()    => console.log(chalk.hex(c.muted)('─'.repeat(56))),
};

export function spinner(text) {
  return ora({ text, color: 'cyan', spinner: 'dots' });
}

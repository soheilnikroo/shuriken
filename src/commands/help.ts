import chalk from 'chalk';
import { injectable, inject } from 'inversify';

import { CommandManager } from '@/core/command-manager';
import { PackageManager } from '@/core/package-manager';
import { TYPES } from '@/core/types';
import type { ICommandDefinition, TCommandOptions } from '@/types';

@injectable()
export class HelpCommand implements ICommandDefinition {
  name = 'help';
  description = 'Show this help text';
  options = [{ name: '[command]', description: 'Show help for a specific command' }] as const;

  constructor(
    @inject(TYPES.CommandManager) private commands: CommandManager,
    @inject(TYPES.PackageManager) private packages: PackageManager
  ) {}

  private line(label?: string, color: chalk.Chalk = chalk.gray) {
    const width = process.stdout.columns ? Math.min(60, process.stdout.columns - 4) : 60;
    if (label) {
      const pad = Math.max(0, (width - label.length - 2) / 2);
      console.log(color(`${'─'.repeat(pad)} ${label} ${'─'.repeat(pad)}`));
    } else {
      console.log(color('─'.repeat(width)));
    }
  }

  async execute(opts: TCommandOptions): Promise<void> {
    const focus = opts.command as string | undefined;
    if (focus) {
      const cmd = this.commands.getCommand(focus);
      if (!cmd) {
        console.log(chalk.red(`\n✖ Command "${focus}" not found.\n`));
        return;
      }

      console.log(chalk.bold.underline(`\nHelp: ${cmd.name}\n`));
      console.log(`  ${cmd.description}\n`);
      if (cmd.options?.length) {
        console.log(chalk.bold('Options:'));
        for (const opt of cmd.options) {
          const flag =
            opt.name.startsWith('<') || opt.name.startsWith('[')
              ? opt.name
              : `--${opt.name}${opt.defaultValue !== undefined ? ` <${opt.name}>` : ''}`;
          const req = opt.required ? chalk.red('required') : chalk.gray('optional');
          console.log(`  ${chalk.cyan(flag.padEnd(24))} ${req.padEnd(9)} ${opt.description}`);
        }
        console.log('');
      }
      return;
    }

    console.log(chalk.bold.underline('\nShuriken CLI — Available Commands\n'));

    const pkgList = await this.packages.listAvailablePackages();
    const hues = [
      chalk.cyan,
      chalk.green,
      chalk.yellow,
      chalk.magenta,
      chalk.blueBright,
      chalk.redBright,
    ];
    for (let i = 0; i < pkgList.length; i++) {
      const pkgName = pkgList[i];
      const color = hues[i % hues.length];
      const def = await this.packages.getPackage(pkgName);
      if (!def || def.commands.length === 0) {
        continue;
      }

      this.line(pkgName.toUpperCase(), color);
      for (const cmd of def.commands) {
        console.log(`  ${color(cmd.name.padEnd(15))} ${cmd.description}`);
      }
      console.log('');
    }
  }
}

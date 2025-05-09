import { intro, log, outro } from '@clack/prompts';
import { Command } from 'commander';
import type { Container } from 'inversify';

import pkgJson from '@/../package.json';
import { HelpCommand } from '@/commands/help';
import { SetupCommand } from '@/commands/setup';
import { UpdateCommand } from '@/commands/update';
import type { CommandManager } from '@/core/command-manager';
import type { Logger } from '@/core/logger';
import type { MigrationManager } from '@/core/migration-manager';
import type { PackageManager } from '@/core/package-manager';
import { TYPES } from '@/core/types';
import type { TCommandOptions } from '@/types';
import { analyzeProjectContext } from '@/utils/analyze-project'; // ← pull in your async analyzer

import type { DocsCommand } from './commands/doc';
import type { IProjectContext } from './types/project-context';

export class CLI {
  private program: Command;

  constructor(private container: Container) {
    this.program = new Command();
  }

  private registerBuiltInCommands(): void {
    const helpCmd = new HelpCommand(
      this.container.get<CommandManager>(TYPES.CommandManager),
      this.container.get<PackageManager>(TYPES.PackageManager)
    );

    this.program
      .name('shuriken')
      .description('CLI tool manager for company packages')
      .version(pkgJson.version);

    this.program
      .command('help')
      .argument('[command]', 'Show help for a specific command')
      .description(helpCmd.description)
      .action(async (cmdName?: string) => {
        try {
          intro('Running "help"');
          const opts: TCommandOptions = cmdName ? { command: cmdName } : {};
          await helpCmd.execute(opts);
          outro('');
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : String(err);
          log.error(`Help failed: ${message}`);
          outro('');
          process.exit(1);
        }
      });

    const docsCmd = this.container.get<DocsCommand>(TYPES.DocsCommand);
    this.program
      .command(docsCmd.name)
      .description(docsCmd.description)
      .option('--format <fmt>', 'mermaid|dot|drawio', 'mermaid')
      .option('--out-dir <dir>', 'output directory', 'docs/diagrams')
      .action(async (...args) => {
        const cmdObj = args[args.length - 1] as Command;
        const opts = cmdObj.opts() as TCommandOptions;

        try {
          intro(`Running "${docsCmd.name}"`);
          await docsCmd.execute({ format: opts.format, 'out-dir': opts.outDir });
          outro('');
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : String(err);
          log.error(`Docs generation failed: ${message}`);
          outro('');
          process.exit(1);
        }
      });
  }

  private async registerPackageCommands(): Promise<void> {
    const pkgManager = this.container.get<PackageManager>(TYPES.PackageManager);
    const cmdManager = this.container.get<CommandManager>(TYPES.CommandManager);
    const migrationManager = this.container.get<MigrationManager>(TYPES.MigrationManager);
    const logger = this.container.get<Logger>(TYPES.Logger);

    const projectContext: IProjectContext = await analyzeProjectContext();

    const packages = await pkgManager.listAvailablePackages();
    for (const pkgName of packages) {
      const pkgDef = await pkgManager.getPackage(pkgName);
      if (!pkgDef) {
        logger.warn(`Skipping ${pkgName}: failed to load definition`);
        continue;
      }

      const pkgCmd = this.program.command(pkgName).description(`Commands for package "${pkgName}"`);

      const registerOptions = (
        builder: Command,
        opts: Array<{ name: string; description: string; defaultValue?: unknown }> = []
      ): Command => {
        const usedShorts = new Set<string>();
        opts.forEach(opt => {
          if (opt.name.startsWith('<')) {
            return;
          }
          const longFlag = opt.name.startsWith('--')
            ? opt.name + (opt.defaultValue !== undefined ? ` <${opt.name.replace(/^--/, '')}>` : '')
            : `--${opt.name}${opt.defaultValue !== undefined ? ` <${opt.name}>` : ''}`;
          const base = opt.name.replace(/^--?/, '');
          const aliasChar = base[0];
          let flagString = longFlag;
          if (aliasChar && !usedShorts.has(aliasChar)) {
            usedShorts.add(aliasChar);
            flagString = `-${aliasChar}, ${longFlag}`;
          }
          if (opt.defaultValue !== undefined) {
            builder = builder.option(
              flagString,
              opt.description,
              opt.defaultValue as string | boolean | string[] | undefined
            );
          } else {
            builder = builder.option(flagString, opt.description);
          }
        });
        return builder;
      };

      const builtInSetup = new SetupCommand(logger, pkgManager, cmdManager);
      const setupDef = pkgDef.commands.find(c => c.name === 'setup');
      let setupBuilder = pkgCmd.command('setup').description(builtInSetup.description);
      setupBuilder = registerOptions(
        setupBuilder,
        setupDef?.options ? [...setupDef.options] : undefined
      );
      setupBuilder = registerOptions(setupBuilder, [
        {
          name: '--pkg-version',
          description: 'Specific package version to setup',
          defaultValue: undefined,
        },
      ]);
      setupBuilder.action(async (opts: TCommandOptions) => {
        try {
          intro(`Running "setup" on ${pkgName}`);
          opts['package-name'] = pkgName;
          await builtInSetup.execute(opts, projectContext);
          outro('Command completed successfully');
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : String(err);
          log.error(`Setup failed: ${message}`);
          outro('Command failed');
          process.exit(1);
        }
      });

      const builtInUpdate = new UpdateCommand(logger, pkgManager, migrationManager);
      const updateDef = pkgDef.commands.find(c => c.name === 'update');
      let updateBuilder = pkgCmd.command('update').description(builtInUpdate.description);
      updateBuilder = registerOptions(
        updateBuilder,
        updateDef?.options ? [...updateDef.options] : undefined
      );
      updateBuilder = registerOptions(updateBuilder, [
        {
          name: '--version',
          description: 'Specific version to migrate to',
          defaultValue: undefined,
        },
      ]);
      updateBuilder.action(async (opts: TCommandOptions) => {
        try {
          intro(`Running "update" on ${pkgName}`);
          opts['package-name'] = pkgName;
          await builtInUpdate.execute(opts);
          outro('Command completed successfully');
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : String(err);
          log.error(`Update failed: ${message}`);
          outro('Command failed');
          process.exit(1);
        }
      });

      for (const cmdDef of pkgDef.commands.filter(c => c.name !== 'setup' && c.name !== 'update')) {
        let sub = pkgCmd.command(cmdDef.name).description(cmdDef.description);
        for (const opt of cmdDef.options ?? []) {
          if (/^[<[].*[>\]]$/.test(opt.name)) {
            sub = sub.argument(opt.name, opt.description, opt.defaultValue);
          }
        }
        sub = registerOptions(sub, cmdDef.options ? [...cmdDef.options] : undefined);
        sub.action(async (...args: unknown[]) => {
          try {
            intro(`Running "${cmdDef.name}" on ${pkgName}`);
            const cmdObj = args[args.length - 1] as Command;
            const opts = cmdObj.opts() as TCommandOptions;
            opts['package-name'] = pkgName;
            await cmdDef.execute(opts, projectContext);
            outro('Command completed successfully');
          } catch (err: unknown) {
            const message = err instanceof Error ? err.message : String(err);
            log.error(`Command failed: ${message}`);
            outro('Command failed');
            process.exit(1);
          }
        });
      }
    }
  }

  public async run(argv: string[] = process.argv): Promise<void> {
    this.registerBuiltInCommands();
    await this.registerPackageCommands();
    await this.program.parseAsync(argv);
  }
}

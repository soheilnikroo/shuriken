import * as fs from 'fs';
import * as path from 'path';

import { injectable, inject } from 'inversify';

import { CommandManager } from '@/core/command-manager';
import { Logger } from '@/core/logger';
import { PackageManager } from '@/core/package-manager';
import { TYPES } from '@/core/types';
import type { ICommandDefinition, TCommandOptions } from '@/types';
import type { IProjectContext } from '@/types/project-context';

@injectable()
export class SetupCommand implements ICommandDefinition {
  name = 'setup';
  description = 'Setup a package';
  options = [
    {
      name: '<package-name>',
      description: 'Name of the package to setup',
      required: true,
    },
    {
      name: '--pkg-version <version>',
      description: 'Specific package version to setup',
      required: false,
    },
  ];

  constructor(
    @inject(TYPES.Logger) private logger: Logger,
    @inject(TYPES.PackageManager) private packageManager: PackageManager,
    @inject(TYPES.CommandManager) private commandManager: CommandManager
  ) {}

  async execute(options: TCommandOptions, ctx: IProjectContext): Promise<void> {
    const packageName = options['package-name'] as string;
    if (!packageName) {
      this.logger.error('Package name is required');
      return;
    }

    const pkgDef = await this.packageManager.getPackage(packageName);
    if (!pkgDef) {
      this.logger.error(`Package "${packageName}" not found`);
      return;
    }

    const desiredVersion = (options['pkg-version'] as string) || pkgDef.metadata.version;

    const configPath = path.resolve(process.cwd(), '.shuriken.json');
    let projectConfig: Record<string, string> = {};
    if (fs.existsSync(configPath)) {
      try {
        projectConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      } catch {
        this.logger.warn('Could not parse existing .shuriken.json; overwriting.');
      }
    }

    if (projectConfig[packageName] === desiredVersion) {
      this.logger.info(`Package "${packageName}" is already set up at version ${desiredVersion}.`);
      return;
    }

    this.logger.info(`Setting up ${packageName}@${desiredVersion}…`);

    await this.commandManager.loadPackageCommands(packageName);
    const setupCmd = pkgDef.commands.find(cmd => cmd.name === 'setup');
    if (!setupCmd) {
      this.logger.error(`Package "${packageName}" does not have a setup command`);
      return;
    }
    await setupCmd.execute({ ...options, version: desiredVersion }, ctx);

    projectConfig[packageName] = desiredVersion;
    fs.writeFileSync(configPath, JSON.stringify(projectConfig, null, 2));

    this.packageManager.markPackageAsInstalled(packageName, desiredVersion);

    this.logger.success(`Package "${packageName}" setup at version ${desiredVersion}`);
  }
}

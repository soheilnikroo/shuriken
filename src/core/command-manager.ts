import { injectable, inject } from 'inversify';

import { Logger } from '@/core/logger';
import { PackageManager } from '@/core/package-manager';
import { TYPES } from '@/core/types';
import type { ICommandDefinition, TCommandOptions } from '@/types';
import type { IProjectContext } from '@/types/project-context';

@injectable()
export class CommandManager {
  private commands: Map<string, ICommandDefinition> = new Map();

  constructor(
    @inject(TYPES.Logger) private logger: Logger,
    @inject(TYPES.PackageManager) private packageManager: PackageManager
  ) {}

  registerCommand(command: ICommandDefinition): void {
    if (this.commands.has(command.name)) {
      this.logger.warn(`Command ${command.name} is already registered. Overwriting.`);
    }

    this.commands.set(command.name, command);
    this.logger.debug(`Registered command: ${command.name}`);
  }

  async loadPackageCommands(packageName: string): Promise<void> {
    const pkg = await this.packageManager.getPackage(packageName);
    if (!pkg) {
      throw new Error(`Package ${packageName} not found`);
    }

    pkg.commands.forEach(command => {
      this.registerCommand(command);
    });

    this.logger.info(`Loaded ${pkg.commands.length} commands from package ${packageName}`);
  }

  getCommand(commandName: string): ICommandDefinition | null {
    return this.commands.get(commandName) || null;
  }

  async executeCommand(
    commandName: string,
    options: TCommandOptions,
    context: IProjectContext
  ): Promise<void> {
    const command = this.getCommand(commandName);
    if (!command) {
      throw new Error(`Command ${commandName} not found`);
    }
    this.logger.info(`Executing command: ${commandName}`);
    await command.execute(options, context);
  }

  getAvailableCommands(): ICommandDefinition[] {
    return Array.from(this.commands.values());
  }
}

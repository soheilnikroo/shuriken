import { Container } from 'inversify';
import 'reflect-metadata';

import { DocsCommand } from '@/commands/doc';
import { CommandManager } from '@/core/command-manager';
import { Logger } from '@/core/logger';
import { MigrationManager } from '@/core/migration-manager';
import { PackageManager } from '@/core/package-manager';
import type { IShurikenConfig } from '@/types';
import type { IPrompt } from '@/types/propmt';

import { FileService } from './file';
import { ProcessService } from './process';
import { PromptService } from './prompt';
import { TYPES } from './types';

export function createContainer(config: IShurikenConfig): Container {
  const container = new Container();

  container.bind<IShurikenConfig>(TYPES.Config).toConstantValue(config);

  container
    .bind<Logger>(TYPES.Logger)
    .toDynamicValue(context => {
      const config = context.container.get<IShurikenConfig>(TYPES.Config);
      return new Logger({
        logLevel: config.logLevel,
        loggerOptions: config.loggerOptions,
      });
    })
    .inSingletonScope();
  container.bind<PackageManager>(TYPES.PackageManager).to(PackageManager).inSingletonScope();
  container.bind<CommandManager>(TYPES.CommandManager).to(CommandManager).inSingletonScope();
  container.bind<MigrationManager>(TYPES.MigrationManager).to(MigrationManager).inSingletonScope();
  container.bind<IPrompt>(TYPES.IPrompt).to(PromptService).inSingletonScope();

  container.bind<FileService>(TYPES.FileService).to(FileService).inSingletonScope();

  container.bind<ProcessService>(TYPES.ProcessService).to(ProcessService).inSingletonScope();
  container.bind<DocsCommand>(TYPES.DocsCommand).to(DocsCommand).inSingletonScope();

  return container;
}

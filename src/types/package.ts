import type { ICommandDefinition } from './command';
import type { IMigrationDefinition } from './migration';

export interface IPackageMetadata {
  name: string;
  version: string;
  description: string;
}

export interface IPackageDefinition {
  metadata: IPackageMetadata;
  commands: ICommandDefinition[];
  migrations?: IMigrationDefinition[];
}

export interface IInstalledPackage extends IPackageMetadata {
  installedVersion: string;
  installedAt: Date;
}

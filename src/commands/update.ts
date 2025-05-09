import { injectable, inject } from 'inversify';

import { Logger } from '@/core/logger';
import { MigrationManager } from '@/core/migration-manager';
import { PackageManager } from '@/core/package-manager';
import { TYPES } from '@/core/types';
import type { ICommandDefinition, TCommandOptions } from '@/types';

@injectable()
export class UpdateCommand implements ICommandDefinition {
  name = 'update';
  description = 'Update a package to the latest version';
  options = [
    {
      name: '<package-name>',
      description: 'Name of the package to update',
      required: true,
    },
    {
      name: '--version <version>',
      description: 'Specific version to update to',
      required: false,
    },
  ];

  constructor(
    @inject(TYPES.Logger) private logger: Logger,
    @inject(TYPES.PackageManager) private packageManager: PackageManager,
    @inject(TYPES.MigrationManager) private migrationManager: MigrationManager
  ) {}

  async execute(options: TCommandOptions): Promise<void> {
    const packageName = options['package-name'] as string;
    const targetVersion = options['version'] as string | undefined;

    if (!packageName) {
      this.logger.error('Package name is required');
      return;
    }

    const installedPackage = this.packageManager.getInstalledPackage(packageName);

    if (!installedPackage) {
      this.logger.error(`Package ${packageName} is not installed`);
      return;
    }

    const pkg = await this.packageManager.getPackage(packageName);

    if (!pkg) {
      this.logger.error(`Package ${packageName} not found`);
      return;
    }

    const currentVersion = installedPackage.installedVersion;
    const latestVersion = targetVersion || pkg.metadata.version;

    this.logger.info(`Updating package ${packageName} from ${currentVersion} to ${latestVersion}`);

    const result = await this.migrationManager.migratePackage(packageName, latestVersion);

    if (result.success) {
      this.logger.success(`Package ${packageName} updated successfully`);
      this.logger.info(`Applied migrations: ${result.completedMigrations.join(', ') || 'none'}`);
    } else {
      this.logger.error(`Package update failed: ${result.error?.message}`);
      this.logger.warn(
        `Completed migrations before failure: ${result.completedMigrations.join(', ') || 'none'}`
      );
      this.logger.error('Update stopped. Please fix the issue and try again.');
    }
  }
}

import { injectable, inject } from 'inversify';
import * as semver from 'semver';

import { Logger } from '@/core/logger';
import { PackageManager } from '@/core/package-manager';
import { TYPES } from '@/core/types';
import type { IMigrationDefinition, TMigrationOptions, IMigrationResult } from '@/types';

@injectable()
export class MigrationManager {
  constructor(
    @inject(TYPES.Logger) private logger: Logger,
    @inject(TYPES.PackageManager) private packageManager: PackageManager
  ) {}

  async getMigrationPath(
    packageName: string,
    fromVersion: string,
    toVersion: string
  ): Promise<IMigrationDefinition[] | undefined> {
    const pkg = await this.packageManager.getPackage(packageName);

    if (!pkg) {
      throw new Error(`Package ${packageName} not found`);
    }

    const sortedMigrations = pkg.migrations?.sort((a, b) =>
      semver.compare(a.targetVersion, b.targetVersion)
    );

    const migrationPath = sortedMigrations?.filter(
      migration =>
        semver.gt(migration.targetVersion, fromVersion) &&
        semver.lte(migration.targetVersion, toVersion)
    );

    return migrationPath;
  }

  async executeMigration(
    migration: IMigrationDefinition,
    options: TMigrationOptions
  ): Promise<void> {
    this.logger.info(
      `Executing migration to version ${migration.targetVersion}: ${migration.description}`
    );
    await migration.execute(options);
  }

  async migratePackage(
    packageName: string,
    fromVersion: string,
    toVersion?: string
  ): Promise<IMigrationResult> {
    const pkg = await this.packageManager.getPackage(packageName);

    if (!pkg) {
      throw new Error(`Package ${packageName} not found`);
    }

    if (!fromVersion) {
      const installedPackage = this.packageManager.getInstalledPackage(packageName);

      if (!installedPackage) {
        throw new Error(`Package ${packageName} is not installed`);
      }

      fromVersion = installedPackage.installedVersion;
    }

    const targetVersion = toVersion || pkg.metadata.version;

    this.logger.info(`Migrating package ${packageName} from ${fromVersion} to ${targetVersion}`);

    const migrationPath = await this.getMigrationPath(packageName, fromVersion, targetVersion);

    if (migrationPath && migrationPath.length === 0) {
      this.logger.info(`No migrations needed for package ${packageName}`);
      return {
        success: true,
        fromVersion,
        toVersion: targetVersion,
        completedMigrations: [],
      };
    }

    const completedMigrations: string[] = [];

    try {
      if (migrationPath && migrationPath.length !== 0) {
        for (const migration of migrationPath) {
          await this.executeMigration(migration, {});
          completedMigrations.push(migration.targetVersion);
        }
      }

      this.packageManager.updateInstalledPackage(packageName, targetVersion);

      return {
        success: true,
        fromVersion,
        toVersion: targetVersion,
        completedMigrations,
      };
    } catch (error) {
      this.logger.error(`Migration failed for package ${packageName}`, error);

      return {
        success: false,
        fromVersion,
        toVersion: targetVersion,
        error: error as Error,
        completedMigrations,
      };
    }
  }
}

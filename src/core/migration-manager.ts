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

    if (!pkg.migrations || pkg.migrations.length === 0) {
      return [];
    }

    const sortedMigrations = pkg.migrations.sort((a, b) =>
      semver.compare(a.targetVersion, b.targetVersion)
    );

    const migrationPath = sortedMigrations.filter(
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
    toVersion: string
  ): Promise<IMigrationResult> {
    const pkg = await this.packageManager.getPackage(packageName);

    if (!pkg) {
      return {
        success: false,
        fromVersion,
        toVersion,
        error: new Error(`Package ${packageName} not found`),
        completedMigrations: [],
      };
    }

    // Check if we're already at the target version
    if (fromVersion === toVersion) {
      this.logger.info(`Package ${packageName} is already at version ${toVersion}`);
      return {
        success: true,
        fromVersion,
        toVersion,
        completedMigrations: [],
      };
    }

    this.logger.info(`Migrating package ${packageName} from ${fromVersion} to ${toVersion}`);

    const migrationPath = await this.getMigrationPath(packageName, fromVersion, toVersion);

    if (!migrationPath || migrationPath.length === 0) {
      this.logger.info(`No migrations needed for package ${packageName}`);
      return {
        success: true,
        fromVersion,
        toVersion,
        completedMigrations: [],
      };
    }

    this.logger.info(`Found ${migrationPath.length} migration(s) to execute`);

    const completedMigrations: string[] = [];

    try {
      for (const migration of migrationPath) {
        this.logger.info(`Starting migration to version ${migration.targetVersion}`);
        
        await this.executeMigration(migration, {
          packageName,
          fromVersion,
          toVersion,
          currentMigrationVersion: migration.targetVersion,
        });
        
        completedMigrations.push(migration.targetVersion);
        this.logger.success(`Migration to version ${migration.targetVersion} completed`);
      }

      this.logger.success(`All migrations completed successfully`);
      return {
        success: true,
        fromVersion,
        toVersion,
        completedMigrations,
      };
    } catch (error) {
      this.logger.error(`Migration failed for package ${packageName}`, error);

      return {
        success: false,
        fromVersion,
        toVersion,
        error: error as Error,
        completedMigrations,
      };
    }
  }
}
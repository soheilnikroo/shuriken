import * as fs from 'fs';
import * as path from 'path';
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
      name: '--to-version <version>', 
      description: 'Specific version to update to',
      required: false,
    },
  ];

  constructor(
    @inject(TYPES.Logger) private logger: Logger,
    @inject(TYPES.PackageManager) private packageManager: PackageManager,
    @inject(TYPES.MigrationManager) private migrationManager: MigrationManager
  ) {}

  private getShurikenConfig(): Record<string, string> {
    const configPath = path.resolve(process.cwd(), '.shuriken.json');
    
    if (!fs.existsSync(configPath)) {
      this.logger.error('.shuriken.json not found. Run setup first.');
      throw new Error('Configuration file not found');
    }

    try {
      const content = fs.readFileSync(configPath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      this.logger.error('Failed to read .shuriken.json');
      throw error;
    }
  }

  private updateShurikenConfig(packageName: string, version: string): void {
    const configPath = path.resolve(process.cwd(), '.shuriken.json');
    const config = this.getShurikenConfig();
    
    config[packageName] = version;
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
  }

  async execute(options: TCommandOptions): Promise<void> {
    const packageName = options['package-name'] as string;
    const targetVersion = options['to-version'] as string | undefined;
  
    if (!packageName) {
      this.logger.error('Package name is required');
      return;
    }
  
    // Get current version from .shuriken.json
    const config = this.getShurikenConfig();
    const currentVersion = config[packageName];
  
    if (!currentVersion) {
      this.logger.error(`Package ${packageName} is not installed. Run setup first.`);
      return;
    }
  
    const pkg = await this.packageManager.getPackage(packageName);
    if (!pkg) {
      this.logger.error(`Package ${packageName} not found`);
      return;
    }
  
    const finalTargetVersion = targetVersion || pkg.metadata.version;
  
    this.logger.info(
      `Updating package ${packageName} from ${currentVersion} to ${finalTargetVersion}`
    );
  
    if (currentVersion === finalTargetVersion) {
      this.logger.info(`Package ${packageName} is already at version ${finalTargetVersion}`);
      return;
    }
  
    const result = await this.migrationManager.migratePackage(
      packageName,
      currentVersion,
      finalTargetVersion
    );
  
    if (result.success) {
      this.updateShurikenConfig(packageName, finalTargetVersion);
      
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
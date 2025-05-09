import * as fs from 'fs';
import * as path from 'path';
import { pathToFileURL } from 'url';

import { injectable, inject } from 'inversify';

import { Logger } from '@/core/logger';
import { TYPES } from '@/core/types';
import * as types from '@/types';
import type { IPackageDefinition, IInstalledPackage } from '@/types';

@injectable()
export class PackageManager {
  private packagesCache = new Map<string, IPackageDefinition>();
  private installedPackagesCache = new Map<string, IInstalledPackage>();

  constructor(
    @inject(TYPES.Config) private config: types.IShurikenConfig,
    @inject(TYPES.Logger) private logger: Logger
  ) {
    this.initializeRegistry();
  }

  private initializeRegistry(): void {
    if (!fs.existsSync(this.config.registryPath)) {
      fs.mkdirSync(path.dirname(this.config.registryPath), { recursive: true });
      fs.writeFileSync(this.config.registryPath, JSON.stringify({ installedPackages: [] }));
    }
    this.loadInstalledPackages();
  }

  private loadInstalledPackages(): void {
    try {
      const registry = JSON.parse(fs.readFileSync(this.config.registryPath, 'utf8'));
      (registry.installedPackages || []).forEach((pkg: types.IInstalledPackage) => {
        this.installedPackagesCache.set(pkg.name, {
          ...pkg,
          installedAt: new Date(pkg.installedAt),
        });
      });
    } catch (error) {
      this.logger.error('Failed to load installed packages', error as Error);
    }
  }

  private saveInstalledPackages(): void {
    try {
      const registry = { installedPackages: Array.from(this.installedPackagesCache.values()) };
      fs.writeFileSync(this.config.registryPath, JSON.stringify(registry, null, 2));
    } catch (error) {
      this.logger.error('Failed to save installed packages', error as Error);
    }
  }

  async getPackage(packageName: string): Promise<IPackageDefinition | null> {
    if (this.packagesCache.has(packageName)) {
      return this.packagesCache.get(packageName)!;
    }

    const distPkg = path.join(process.cwd(), 'dist', 'packages', packageName, 'index.js');
    const srcJsPkg = path.join(this.config.packagesPath, packageName, 'index.js');
    const srcTsPkg = path.join(this.config.packagesPath, packageName, 'index.ts');

    let entryPath: string;
    if (fs.existsSync(distPkg)) {
      entryPath = distPkg;
    } else if (fs.existsSync(srcJsPkg)) {
      entryPath = srcJsPkg;
    } else if (fs.existsSync(srcTsPkg)) {
      entryPath = srcTsPkg;
    } else {
      this.logger.error(
        `Package "${packageName}" not found. Checked:\n` +
          `  • ${distPkg}\n` +
          `  • ${srcJsPkg}\n` +
          `  • ${srcTsPkg}`
      );
      return null;
    }

    try {
      const url = pathToFileURL(entryPath).href;
      const mod = await import(url);

      const pkgDef: IPackageDefinition = mod.default;
      if (!pkgDef) {
        this.logger.error(`Package "${packageName}" has no default export`);
        return null;
      }

      this.packagesCache.set(packageName, pkgDef);
      return pkgDef;
    } catch (err) {
      this.logger.error(`Failed to load package "${packageName}"`, err);
      return null;
    }
  }

  async listAvailablePackages(): Promise<string[]> {
    try {
      const base = fs.existsSync(path.join(process.cwd(), 'dist', 'packages'))
        ? path.join(process.cwd(), 'dist', 'packages')
        : this.config.packagesPath;

      return fs
        .readdirSync(base, { withFileTypes: true })
        .filter(d => d.isDirectory())
        .map(d => d.name)
        .filter(name => {
          const idxJs = path.join(base, name, 'index.js');
          const idxTs = path.join(base, name, 'index.ts');
          return fs.existsSync(idxJs) || fs.existsSync(idxTs);
        });
    } catch (error) {
      this.logger.error('Failed to list available packages', error as Error);
      return [];
    }
  }

  getInstalledPackage(name: string): IInstalledPackage | null {
    return this.installedPackagesCache.get(name) || null;
  }

  markPackageAsInstalled(name: string, version: string): void {
    this.getPackage(name).then(pkg => {
      if (!pkg) {
        return;
      }
      const inst: IInstalledPackage = {
        name: pkg.metadata.name,
        version: pkg.metadata.version,
        description: pkg.metadata.description,
        installedVersion: version,
        installedAt: new Date(),
      };
      this.installedPackagesCache.set(name, inst);
      this.saveInstalledPackages();
    });
  }

  updateInstalledPackage(name: string, version: string): void {
    const inst = this.getInstalledPackage(name);
    if (!inst) {
      return;
    }
    inst.installedVersion = version;
    inst.installedAt = new Date();
    this.installedPackagesCache.set(name, inst);
    this.saveInstalledPackages();
  }
}

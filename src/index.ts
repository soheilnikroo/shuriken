import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { log } from '@clack/prompts';

import { CLI } from '@/cli';
import { createContainer } from '@/core/container';
import type { IShurikenConfig } from '@/types';

const builtPackagesDir = path.resolve(__dirname, 'packages');
const isBuiltVersion = fs.existsSync(builtPackagesDir);

const defaultConfig: IShurikenConfig = {
  packagesPath: isBuiltVersion ? builtPackagesDir : path.resolve(process.cwd(), 'packages'),
  registryPath: path.join(os.homedir(), '.shuriken', 'registry.json'),
  logLevel: 'debug',
  loggerOptions: {
    useColors: true,
    useFunPrefixes: true,
    timestamps: true,
  },
};

export function createShuriken(config: Partial<IShurikenConfig> = {}): CLI {
  const finalConfig: IShurikenConfig = {
    ...defaultConfig,
    ...config,
    loggerOptions: {
      ...defaultConfig.loggerOptions,
      ...config.loggerOptions,
    },
  };
  const container = createContainer(finalConfig);
  return new CLI(container);
}

export async function main(): Promise<void> {
  const cli = createShuriken();
  await cli.run();
}

export * from '@/types';
export { Logger } from '@/core/logger';
export { PackageManager } from '@/core/package-manager';
export { CommandManager } from '@/core/command-manager';
export { MigrationManager } from '@/core/migration-manager';

if (require.main === module) {
  main().catch(error => {
    log.error(`Unhandled error: ${(error as Error).message}`);
    process.exit(1);
  });
}

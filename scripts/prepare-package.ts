import fs from 'fs';
import fsPromises from 'fs/promises';
import path from 'path';
import { setTimeout as wait } from 'timers/promises';

import { intro, outro, text, spinner, log, isCancel, cancel } from '@clack/prompts';

interface TsconfigPaths {
  [key: string]: string[];
}

interface TsconfigCompilerOptions {
  paths?: TsconfigPaths;
  [key: string]: unknown;
}

interface TsconfigJson {
  compilerOptions?: TsconfigCompilerOptions;
  [key: string]: unknown;
}

async function updateRollupConfig(packageName: string): Promise<void> {
  const rollupConfigPath = path.resolve(process.cwd(), 'rollup.config.js');
  
  if (!fs.existsSync(rollupConfigPath)) {
    log.warn('rollup.config.js not found, skipping rollup update');
    return;
  }

  try {
    const rollupContent = await fsPromises.readFile(rollupConfigPath, 'utf8');
    
    // Check if the alias already exists
    if (rollupContent.includes(`@${packageName}`)) {
      log.info(`Rollup alias for @${packageName} already exists`);
      return;
    }

    const lines = rollupContent.split('\n');
    const newAlias = `        { find: '@${packageName}', replacement: path.resolve(PACKAGES_DIR, '${packageName}') },`;
    
    let insertIndex = -1;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.includes("{ find: '@jarvis', replacement: path.resolve(PACKAGES_DIR, 'jarvis') }")) {
        insertIndex = i + 1; 
        break;
      }
    }
    
    if (insertIndex === -1) {
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.includes("{ find: '@") && line.includes("PACKAGES_DIR") && line.includes("},")) {
          insertIndex = i + 1;
        }
      }
    }
    
    if (insertIndex !== -1) {
      lines.splice(insertIndex, 0, newAlias);
      const updatedContent = lines.join('\n');
      
      await fsPromises.writeFile(rollupConfigPath, updatedContent);
      log.success(`✅ rollup.config.js updated with @${packageName} alias`);
    } else {
      log.warn('Could not find insertion point in rollup.config.js');
      log.info('Please manually add this line after the @jarvis alias:');
      log.info(newAlias);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log.error(`Failed to update rollup.config.js: ${errorMessage}`);
  }
}

async function updateTsconfigPaths(packageName: string): Promise<void> {
  const tsconfigPath = path.resolve(process.cwd(), 'tsconfig.json');
  
  try {
    const tsconfigContent = await fsPromises.readFile(tsconfigPath, 'utf8');
    const tsconfig: TsconfigJson = JSON.parse(tsconfigContent);
    
    tsconfig.compilerOptions = tsconfig.compilerOptions || {};
    tsconfig.compilerOptions.paths = {
      ...tsconfig.compilerOptions.paths,
      '@/*': ['src/*'],
      '@packages/*': ['packages/*'],
      '@groot/*': ['packages/groot/*'],
      '@snapp-ui/*': ['packages/snapp-ui/*'],
      [`@${packageName}/*`]: [`packages/${packageName}/*`],
    };
    
    await fsPromises.writeFile(tsconfigPath, JSON.stringify(tsconfig, null, 2));
    log.success('✅ tsconfig.json updated with path aliases');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log.error(`Failed to update tsconfig.json: ${errorMessage}`);
    throw error;
  }
}

async function createPackageFiles(
  packageDir: string,
  packageName: string,
  version: string,
  description: string,
  displayName: string
): Promise<void> {
  const baseName = packageName
    .replace(/^@.*\//, '')
    .replace(/[^A-Za-z0-9]/g, '');
  const loggerVar = `${baseName}Logger`;

  fs.mkdirSync(path.join(packageDir, 'commands'), { recursive: true });
  fs.writeFileSync(
    path.join(packageDir, 'commands', '.gitkeep'),
    '// You can add custom commands in this folder'
  );
  fs.mkdirSync(path.join(packageDir, 'migrations'), { recursive: true });
  fs.mkdirSync(path.join(packageDir, 'core'), { recursive: true });

  const indexContent = `import { IPackageDefinition } from '@/types';
import setupCommand from './setup';
import { migrations } from './migrations';

const packageDefinition: IPackageDefinition = {
  metadata: {
    name: '${packageName}',
    version: '${version}',
    description: '${description}',
  },
  commands: [
    setupCommand,
    // Add more commands here
  ],
  migrations,
};

export default packageDefinition;
`;
  fs.writeFileSync(path.join(packageDir, 'index.ts'), indexContent);

  const loggerContent = `import { Logger } from '@/core/logger';

export const ${packageName}Logger = new Logger({
  logLevel: 'info',
  loggerOptions: {
    useColors: true,
    useFunPrefixes: true,
  },
}).child('${packageName}');
`;
  fs.writeFileSync(path.join(packageDir, 'core', 'logger.ts'), loggerContent);

  const setupContent = `import { ICommandDefinition, TCommandOptions } from '@/types';
import { ${packageName}Logger } from '@${packageName}/core/logger';
import { promptService } from '@/services/prompt';

const setupOptions = [
    /*
    {
      name: 'format',
      description: 'I am Groot? (What format you want: ts, js, json, rc)',
      defaultValue: 'ts',
      required: false, // user can pass by -f or --format
    },
    */
] as const;

export type TSetupOpts = TCommandOptions<typeof setupOptions>;

const setupCommand: ICommandDefinition = {
  name: 'setup',
  description: 'Setup ${displayName}',
  options: setupOptions,
  async execute(options: TSetupOpts): Promise<void> {
    ${loggerVar}.info('Preparing ${displayName}…');

    const answers = await promptService.input('What shall we name your project?');
    if (!answers) return;

    const projectName = answers;
    const fs = await import('fs');
    const path = await import('path');
    const configPath = path.join(process.cwd(), '${packageName}.config.json');
    fs.writeFileSync(
      configPath,
      JSON.stringify(
        {
          projectName,
          installedAt: new Date().toISOString(),
          version: '${version}',
        },
        null,
        2
      )
    );

    ${loggerVar}.success('${displayName} has been set up successfully!');
  },
};

export default setupCommand;
`;
  fs.writeFileSync(path.join(packageDir, 'setup.ts'), setupContent);

  const fileContent = `import { FileService } from '@/core/file';
  
import { ${packageName}Logger } from './logger';

export const fs = new FileService(${packageName}Logger);
`;
  fs.writeFileSync(path.join(packageDir, 'core', 'file.ts'), fileContent);

  const processContent = `import { ProcessService } from '@/core/process';
    
import { ${packageName}Logger } from './logger';

export const ps = new ProcessService(${packageName}Logger);
`;
  fs.writeFileSync(path.join(packageDir, 'core', 'process.ts'), processContent);

  const migrationsIndexContent = `import { IMigrationDefinition } from '@/types';
import migration1_0_0 from './1.0.0';

export const migrations: IMigrationDefinition[] = [migration1_0_0];
`;
  fs.writeFileSync(path.join(packageDir, 'migrations', 'index.ts'), migrationsIndexContent);

  const migration100Content = `import { IMigrationDefinition, TMigrationOptions } from '@/types';
import { Logger } from '@/core/logger';

const migrationLogger = new Logger({ logLevel: 'info' }).child('${packageName}-migration-1.0.0');

const migration: IMigrationDefinition = {
  targetVersion: '1.0.0',
  description: 'Initial deployment',

  async execute(options: TMigrationOptions): Promise<void> {
    migrationLogger.info('Executing migration to version 1.0.0…');

    // Your migration logic here

    migrationLogger.success('Migration completed successfully');
  },
};

export default migration;
`;
  fs.writeFileSync(path.join(packageDir, 'migrations', '1.0.0.ts'), migration100Content);
}

async function main(): Promise<void> {
  intro('🥷 Shuriken Package Template Generator 🥷');

  const packageName = await text({
    message: 'Package name (e.g., my‑package):',
    validate: v => (!v ? 'Package name is required' : undefined),
  });
  if (isCancel(packageName)) {
    cancel('Operation cancelled.');
    process.exit(0);
  }

  const displayName = await text({ message: 'Display name:' });
  if (isCancel(displayName)) {
    cancel('Operation cancelled.');
    process.exit(0);
  }

  const description = await text({ message: 'Description:' });
  if (isCancel(description)) {
    cancel('Operation cancelled.');
    process.exit(0);
  }

  const versionInput = await text({
    message: 'Initial version (default: 1.0.0):',
  });
  if (isCancel(versionInput)) {
    cancel('Operation cancelled.');
    process.exit(0);
  }
  const version = versionInput || '1.0.0';

  const packageDir = path.join(process.cwd(), 'packages', String(packageName));
  if (fs.existsSync(packageDir)) {
    log.error(`Package directory already exists: ${packageDir}`);
    process.exit(1);
  }

  const s = spinner();
  s.start('Creating package structure…');
  await wait(300);

  await createPackageFiles(
    packageDir,
    String(packageName),
    String(version),
    String(description),
    String(displayName)
  );

  s.stop('Scaffold complete!');

  await updateTsconfigPaths(String(packageName));

  await updateRollupConfig(String(packageName));

  outro(`✅ Package '${packageName}' created at:\n  ${packageDir}`);
}

main().catch((err: unknown) => {
  const errorMessage = err instanceof Error ? err.message : String(err);
  log.error(`Error creating package: ${errorMessage}`);
  process.exit(1);
});
import fs from 'fs';
import fsPromises from 'fs/promises';
import path from 'path';
import { setTimeout as wait } from 'timers/promises';

import { intro, outro, text, spinner, log, isCancel, cancel } from '@clack/prompts';

async function main() {
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

  const baseName = String(packageName)
    .replace(/^@.*\//, '')
    .replace(/[^A-Za-z0-9]/g, '');
  const loggerVar = `${baseName}Logger`;
  const promptVar = `${baseName}PromptService`;

  const packageDir = path.join(process.cwd(), 'packages', String(packageName));
  if (fs.existsSync(packageDir)) {
    log.error(`Package directory already exists: ${packageDir}`);
    process.exit(1);
  }

  const s = spinner();
  s.start('Creating package structure…');
  await wait(300);

  fs.mkdirSync(path.join(packageDir, 'commands'), { recursive: true });
  fs.writeFileSync(
    path.join(packageDir, 'commands', '.gitkeep'),
    '// You can add custom commands in this folder'
  );
  fs.mkdirSync(path.join(packageDir, 'migrations'), { recursive: true });

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
  fs.mkdirSync(path.join(packageDir, 'core'), { recursive: true });
  fs.writeFileSync(path.join(packageDir, 'core', 'logger.ts'), loggerContent);

  const setupContent = `import { ICommandDefinition, TCommandOptions } from '@/types';
import { ${packageName}Logger } from '@${packageName}/core/logger';
import { promptService } from '@/services/propmt';



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

    const answers = await ${promptVar}.input('What shall we name your project?');
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

  s.stop('Scaffold complete!');

  const tsconfigPath = path.resolve(process.cwd(), 'tsconfig.json');
  const tsconfig = JSON.parse(await fsPromises.readFile(tsconfigPath, 'utf8'));
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

  outro(`✅ Package '${packageName}' created at:\n  ${packageDir}`);
}

main().catch(err => {
  log.error(`Error creating package: ${String(err)}`);
  process.exit(1);
});

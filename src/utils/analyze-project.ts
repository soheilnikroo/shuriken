import * as semver from 'semver';

import { FileService } from '@/core/file';
import { Logger } from '@/core/logger';
import type { IProjectContext } from '@/types/project-context';

import { detectProjectType } from './detect-project-type';

const fs = new FileService(new Logger({ logLevel: 'info' }));

export async function analyzeProjectContext(): Promise<IProjectContext> {
  const isTS = fs.exists('tsconfig.json');

  const projectType = await detectProjectType();

  let pkg: {
    engines?: { node?: string };
    scripts?: Record<string, string>;
    devDependencies?: Record<string, string>;
    dependencies?: Record<string, string>;
  } = {};
  try {
    pkg = await fs.readJson('package.json');
  } catch {}

  let nodeEngine: string | undefined;
  if (pkg.engines?.node && semver.validRange(pkg.engines.node)) {
    nodeEngine = pkg.engines.node;
  }

  let installedWithShuriken: Record<string, string> = {};
  try {
    installedWithShuriken = await fs.readJson<Record<string, string>>('.shuriken.json');
  } catch {}

  const hasStorybook =
    fs.exists('.storybook') ||
    Boolean(pkg.scripts && Object.keys(pkg.scripts).some(key => /storybook/i.test(key)));

  const hasUnitTests =
    fs.exists('jest.config.js') ||
    fs.exists('jest.config.ts') ||
    fs.exists('vitest.config.js') ||
    fs.exists('vitest.config.ts') ||
    fs.exists('mocha.opts') ||
    fs.exists('tests') ||
    fs.exists('__tests__') ||
    Boolean(pkg.scripts && Object.keys(pkg.scripts).some(key => /(^test$|\btest:)/i.test(key)));

  return {
    isTS,
    projectType: projectType as IProjectContext['projectType'],
    nodeEngine,
    installedWithShuriken,
    hasStorybook,
    hasUnitTests,
  };
}

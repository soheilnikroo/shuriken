import path from 'path';

import { camelCase, kebabCase, pascalCase } from 'change-case';

import { promptService } from '@/services/prompt';
import type { ICommandDefinition, TCommandOptions } from '@/types';
import type { IProjectContext } from '@/types/project-context';
import { fs } from '@jarvis/core/file';
import { jarvisLogger } from '@jarvis/core/logger';
import { generateComponent } from '@jarvis/template/component';
import { generateStories } from '@jarvis/template/component-stories';
import { generateComponentTest } from '@jarvis/template/component-test';
import { generateComponentTypes } from '@jarvis/template/component-types';
import { generateIndexFile } from '@jarvis/template/index-file';

const setupOptions = [
  {
    name: 'format',
    description: 'Choose your language flavor (ts/js)',
    defaultValue: 'ts',
    required: false,
  },
  {
    name: 'storybook',
    description: 'Include Storybook file?',
    defaultValue: 'false',
    required: false,
  },
  {
    name: 'use',
    description: 'Base path to create the component in',
    defaultValue: undefined,
    required: false,
  },
] as const;

export type TSetupOpts = TCommandOptions<typeof setupOptions>;

const createComponentCommand: ICommandDefinition = {
  name: 'component',
  description: 'Jarvis: generate a shiny new React component for you',
  options: setupOptions,
  async execute(options: TSetupOpts, ctx: IProjectContext): Promise<void> {
    jarvisLogger.info('🕹️ Booting up Jarvis...');
    jarvisLogger.step('👋 Greetings, human! Ready to craft some code magic?');

    const useTS = options.format === 'ts';
    // @ts-expect-error fix this later
    const useStory = options.storybook === 'true';

    const name = await promptService.input(
      '🤖 Jarvis: What shall we name your new component, master?'
    );
    const componentName = {
      camelCase: camelCase(name),
      pascalCase: pascalCase(name),
      kebabCase: kebabCase(name),
    };

    let targetBaseDir: string;
    if (options.use) {
      targetBaseDir = path.resolve(process.cwd(), options.use);
    } else {
      const here = await promptService.confirm(
        '📍 Create this component in the current directory?'
      );
      if (here) {
        targetBaseDir = process.cwd();
      } else {
        targetBaseDir = await promptService.folderTree(
          '📁 Select the folder where this component should live'
        );
      }
    }

    const componentDir = path.join(targetBaseDir, componentName.kebabCase);
    jarvisLogger.startSpinner(`🔨 Cooking up files in ${componentDir}…`);
    fs.ensureDir(componentDir);

    fs.write(
      componentDir,
      `${componentName.kebabCase}.${useTS ? 'tsx' : 'jsx'}`,
      generateComponent({ componentName })
    );
    fs.write(componentDir, `index.${useTS ? 'ts' : 'js'}`, generateIndexFile({ componentName }));

    if (useStory) {
      fs.write(
        componentDir,
        `${componentName.kebabCase}.stories.${useTS ? 'tsx' : 'jsx'}`,
        generateStories({ componentName })
      );
      jarvisLogger.step('📚 Storybook file generated');
    }

    if (ctx.isTS) {
      fs.write(
        componentDir,
        `${componentName.kebabCase}.types.ts`,
        generateComponentTypes({ componentName })
      );
      jarvisLogger.step('📜 Types file generated');
    }

    if (ctx.hasUnitTests) {
      fs.write(
        componentDir,
        `${componentName.kebabCase}.tests.${useTS ? 'ts' : 'js'}`,
        generateComponentTest({ componentName })
      );
      jarvisLogger.step('🧪 Test file generated');
    }

    jarvisLogger.stopSpinner('✅ Files are ready!');
    jarvisLogger.success('🎉 Jarvis has delivered your component—enjoy!');
  },
};

export default createComponentCommand;

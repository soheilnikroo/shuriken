import fs from 'fs';
import path from 'path';

import { confirm, select, text, isCancel, cancel, multiselect, type Option } from '@clack/prompts';
import { injectable } from 'inversify';

import type { IPrompt } from '@/types/propmt';

@injectable()
export class PromptService implements IPrompt {
  async confirm(message: string): Promise<boolean> {
    const result = await confirm({ message });
    if (isCancel(result)) {
      cancel('Operation cancelled.');
      process.exit(0);
    }
    return result;
  }

  async select<T>(message: string, choices: Array<T & { display?: string }>): Promise<T> {
    const options = choices.map(choice => ({
      label: choice.display ?? String(choice),
      value: choice,
    })) as Option<T>[];

    const result = await select<T>({ message, options });
    if (isCancel(result)) {
      cancel('Operation cancelled.');
      process.exit(0);
    }
    return result;
  }

  async input(
    message: string,
    validate?: (value: string) => string | Error | undefined
  ): Promise<string> {
    const result = await text({ message, validate });
    if (isCancel(result)) {
      cancel('Operation cancelled.');
      process.exit(0);
    }
    return result;
  }

  async multiSelect<T>(message: string, options: Option<T>[], required?: boolean): Promise<T[]> {
    const result = (await multiselect({ message, options, required })) as T[];
    if (isCancel(result)) {
      cancel('Operation cancelled.');
      process.exit(0);
    }
    return result;
  }

  async folderTree(message: string, rootDir = process.cwd()): Promise<string> {
    const walk = (rel = ''): string[] => {
      const abs = path.join(rootDir, rel);
      let list: string[] = [];
      for (const entry of fs.readdirSync(abs, { withFileTypes: true })) {
        if (entry.isDirectory()) {
          const childRel = rel ? path.join(rel, entry.name) : entry.name;
          list.push(childRel);
          list = list.concat(walk(childRel));
        }
      }
      return list;
    };

    const relPaths = [''].concat(walk());
    const options: Option<string>[] = relPaths.map(rel => ({
      label: rel === '' ? '.' : rel,
      value: path.join(rootDir, rel),
    }));

    const result = await select<string>({ message, options });
    if (isCancel(result)) {
      cancel('Operation cancelled.');
      process.exit(0);
    }
    return result;
  }
}

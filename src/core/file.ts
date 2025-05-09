import { existsSync, mkdirSync, copyFileSync } from 'fs';
import * as fs from 'fs/promises';
import path from 'path';

import { injectable, inject } from 'inversify';

import { TYPES } from '@/core/types';

import { Logger } from './logger';

@injectable()
export class FileService {
  constructor(@inject(TYPES.Logger) private logger: Logger) {}

  async readFile(path: string, encoding: BufferEncoding = 'utf8'): Promise<string> {
    this.logger.debug(`Reading file at ${path}`);
    return fs.readFile(path, { encoding });
  }

  async writeFile(path: string, data: string): Promise<void> {
    this.logger.debug(`Writing file to ${path}`);
    await fs.writeFile(path, data, { encoding: 'utf8' });
  }

  async readJson<T>(path: string): Promise<T> {
    const content = await this.readFile(path);
    this.logger.debug(`Parsing JSON from ${path}`);
    return JSON.parse(content) as T;
  }

  async writeJson(path: string, data: unknown, pretty: boolean = true): Promise<void> {
    this.logger.debug(`Writing JSON to ${path}`);
    const text = pretty ? JSON.stringify(data, null, 2) : JSON.stringify(data);
    await this.writeFile(path, `${text}\n`);
  }

  async readdir(dir: string): Promise<string[]> {
    this.logger.debug(`Reading directory at ${dir}`);
    return fs.readdir(dir);
  }

  ensureDir(dir: string): void {
    if (!existsSync(dir)) {
      this.logger.debug(`Creating directory ${dir}`);
      mkdirSync(dir, { recursive: true });
    }
  }

  exists(path: string): boolean {
    return existsSync(path);
  }

  copy(src: string, dest: string): void {
    this.logger.debug(`Copying file from ${src} to ${dest}`);
    copyFileSync(src, dest);
  }

  async write(paths: string, filePath: string, data: string): Promise<void> {
    this.logger.debug(`Writing file to ${paths}`);
    try {
      this.ensureDir(paths);
      await this.writeFile(path.join(paths, filePath), data);
    } catch (error) {
      this.logger.error(`Error writing file: ${error}`);
      throw error;
    }
  }
}

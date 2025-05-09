import { spawn } from 'child_process';

import { injectable, inject } from 'inversify';

import { TYPES } from '@/core/types';

import { Logger } from './logger';

@injectable()
export class ProcessService {
  constructor(@inject(TYPES.Logger) private logger: Logger) {}

  run(
    command: string,
    args: string[] = [],
    cwd?: string
  ): Promise<{ stdout: string; stderr: string; exitCode: number }> {
    this.logger.info(`Executing: ${command} ${args.join(' ')}`);
    return new Promise((resolve, reject) => {
      const proc = spawn(command, args, {
        cwd: cwd || process.cwd(),
        shell: true,
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      let stdout = '';
      let stderr = '';

      proc.stdout.on('data', chunk => {
        const text = chunk.toString();
        stdout += text;
        this.logger.debug(text.trim());
      });
      proc.stderr.on('data', chunk => {
        const text = chunk.toString();
        stderr += text;
        this.logger.error(text.trim());
      });
      proc.on('error', err => reject(err));
      proc.on('close', code => resolve({ stdout, stderr, exitCode: code ?? 0 }));
    });
  }
}

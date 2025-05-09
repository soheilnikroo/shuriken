import { log, spinner } from '@clack/prompts';
import chalk from 'chalk';
import figures from 'figures';
import { injectable } from 'inversify';

import * as types from '@/types';

export enum ELogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  FATAL = 4,
  NONE = 5,
}

const LOG_LEVEL_NAMES: Record<ELogLevel, string> = {
  [ELogLevel.DEBUG]: 'debug',
  [ELogLevel.INFO]: 'info',
  [ELogLevel.WARN]: 'warn',
  [ELogLevel.ERROR]: 'error',
  [ELogLevel.FATAL]: 'fatal',
  [ELogLevel.NONE]: 'none',
};

const LOG_ICONS: Record<ELogLevel, string> = {
  [ELogLevel.DEBUG]: figures.bullet,
  [ELogLevel.INFO]: figures.info,
  [ELogLevel.WARN]: figures.warning,
  [ELogLevel.ERROR]: figures.cross,
  [ELogLevel.FATAL]: figures.cross,
  [ELogLevel.NONE]: '',
};

const FUN_PREFIXES: Record<ELogLevel, string[]> = {
  [ELogLevel.DEBUG]: ['𖣘 Ninja whispers:', '𖣘 Shuriken spy:', '𖣘 Stealthy debug:'],
  [ELogLevel.INFO]: ['𖣘 Shuriken says:', '𖣘 FYI Ninja:', '𖣘 Wisdom of the blade:'],
  [ELogLevel.WARN]: ['𖣘 Careful, warrior:', '𖣘 Shuriken wobbles:', '𖣘 Ninja senses danger:'],
  [ELogLevel.ERROR]: ['𖣘 Shuriken missed!', '𖣘 Failed strike:', '𖣘 Combat error:'],
  [ELogLevel.FATAL]: ['𖣘 CRITICAL FAILURE:', '𖣘 MISSION ABORTED:', '𖣘 NINJA DOWN:'],
  [ELogLevel.NONE]: [''],
};

export interface ILoggerOptions {
  useColors?: boolean;
  useFunPrefixes?: boolean;
  timestamps?: boolean;
  outputFile?: string;
}

@injectable()
export class Logger {
  private logLevel: ELogLevel;
  private options: ILoggerOptions;
  private spinnerInstance: ReturnType<typeof spinner> | null = null;

  constructor(private config: types.ILoggerConfig) {
    this.logLevel = this.parseLogLevel(config.logLevel);
    this.options = {
      useColors: true,
      useFunPrefixes: true,
      timestamps: true,
      ...config.loggerOptions,
    };
  }

  private parseLogLevel(level: string): ELogLevel {
    switch (level.toLowerCase()) {
      case 'debug':
        return ELogLevel.DEBUG;
      case 'info':
        return ELogLevel.INFO;
      case 'warn':
        return ELogLevel.WARN;
      case 'error':
        return ELogLevel.ERROR;
      case 'fatal':
        return ELogLevel.FATAL;
      case 'none':
        return ELogLevel.NONE;
      default:
        return ELogLevel.INFO;
    }
  }

  private getRandomPrefix(level: ELogLevel): string {
    const prefixes = FUN_PREFIXES[level];
    return this.options.useFunPrefixes ? prefixes[Math.floor(Math.random() * prefixes.length)] : '';
  }

  private formatTimestamp(): string {
    return this.options.timestamps ? `[${new Date().toISOString()}] ` : '';
  }

  private formatLogMessage(level: ELogLevel, message: string, ...args: unknown[]): string {
    const timestamp = this.formatTimestamp();
    const icon = LOG_ICONS[level];
    const funPrefix = this.getRandomPrefix(level);
    const levelName = LOG_LEVEL_NAMES[level];
    let formatted = `$${levelName}: ${timestamp}${icon} ${funPrefix} ${message}`;
    if (args.length) {
      formatted += ` ${args
        .map(arg => (typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)))
        .join(' ')}`;
    }
    return formatted;
  }

  private colorize(level: ELogLevel, msg: string): string {
    if (!this.options.useColors) {
      return msg;
    }
    switch (level) {
      case ELogLevel.DEBUG:
        return chalk.gray(msg);
      case ELogLevel.INFO:
        return chalk.blue(msg);
      case ELogLevel.WARN:
        return chalk.yellow(msg);
      case ELogLevel.ERROR:
        return chalk.red(msg);
      case ELogLevel.FATAL:
        return chalk.bgRed.white(msg);
      default:
        return msg;
    }
  }

  private log(level: ELogLevel, message: string, ...args: unknown[]): void {
    if (level < this.logLevel) {
      return;
    }
    const output = this.colorize(level, this.formatLogMessage(level, message, ...args));
    switch (level) {
      case ELogLevel.DEBUG:
      case ELogLevel.INFO:
        log.message(output);
        break;
      case ELogLevel.WARN:
        log.warn(output);
        break;
      case ELogLevel.ERROR:
        log.error(output);
        break;
      case ELogLevel.FATAL:
        log.error(output);
        process.exit(1);
    }
  }

  debug(message: string, ...args: unknown[]): void {
    this.log(ELogLevel.DEBUG, message, ...args);
  }

  info(message: string, ...args: unknown[]): void {
    this.log(ELogLevel.INFO, message, ...args);
  }

  warn(message: string, ...args: unknown[]): void {
    this.log(ELogLevel.WARN, message, ...args);
  }

  error(message: string, ...args: unknown[]): void {
    this.log(ELogLevel.ERROR, message, ...args);
  }

  fatal(message: string, ...args: unknown[]): void {
    this.log(ELogLevel.FATAL, message, ...args);
  }

  step(message: string, ...args: unknown[]): void {
    if (ELogLevel.INFO < this.logLevel) {
      return;
    }
    const output = this.colorize(
      ELogLevel.INFO,
      this.formatLogMessage(ELogLevel.INFO, message, ...args)
    );
    log.step(output);
  }

  success(message: string, ...args: unknown[]): void {
    if (ELogLevel.INFO < this.logLevel) {
      return;
    }
    const output = this.colorize(
      ELogLevel.INFO,
      this.formatLogMessage(ELogLevel.INFO, message, ...args)
    );
    log.success(output);
  }

  spinner(): ReturnType<typeof spinner> {
    this.spinnerInstance = spinner();
    return this.spinnerInstance;
  }

  startSpinner(message: string): void {
    if (this.spinnerInstance) {
      this.spinnerInstance.stop();
    }
    this.spinnerInstance = spinner();
    this.spinnerInstance.start(message);
  }

  stopSpinner(finalMessage?: string): void {
    if (!this.spinnerInstance) {
      return;
    }
    this.spinnerInstance.stop(finalMessage ?? '');
    this.spinnerInstance = null;
  }

  child(prefix: string): Logger {
    const childLogger = new Logger(this.config);
    const methods = ['debug', 'info', 'warn', 'error', 'fatal', 'step', 'success'] as const;
    for (const method of methods) {
      const original = childLogger[method] as (msg: string, ...args: unknown[]) => void;
      childLogger[method] = (msg: string, ...args: unknown[]): void => {
        original.call(childLogger, `[${prefix}] ${msg}`, ...args);
      };
    }
    return childLogger;
  }
}

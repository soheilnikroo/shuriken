export * from './package';
export * from './command';
export * from './migration';

export interface ILoggerOptions {
  useColors?: boolean;
  useFunPrefixes?: boolean;
  timestamps?: boolean;
  outputFile?: string;
}

export interface ILoggerConfig {
  logLevel: 'debug' | 'info' | 'warn' | 'error' | 'fatal' | 'none';
  loggerOptions?: ILoggerOptions;
}

export interface IShurikenConfig extends ILoggerConfig {
  packagesPath: string;
  registryPath: string;
}

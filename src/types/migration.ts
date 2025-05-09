export type TMigrationOptions = Record<string, string | number | boolean | undefined>;

export interface IMigrationDefinition {
  targetVersion: string;
  description: string;
  execute: (options: TMigrationOptions) => Promise<void>;
}

export interface IMigrationResult {
  success: boolean;
  fromVersion: string;
  toVersion: string;
  error?: Error;
  completedMigrations: string[];
}

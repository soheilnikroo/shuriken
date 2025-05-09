import type { IProjectContext } from './project-context';

export interface ICommandOptionDefinition<Name extends string = string, Default = unknown> {
  name: Name;
  description: string;
  defaultValue?: Default;
  required?: boolean;
}

export type TCamelCase<S extends string> = S extends `${infer Head}-${infer Tail}`
  ? `${Head}${Capitalize<TCamelCase<Tail>>}`
  : S;

export type TCleanName<Name extends string> = Name extends `<${infer A}>` | `[${infer A}]`
  ? TCamelCase<A>
  : Name extends `--${infer A}`
    ? TCamelCase<A>
    : TCamelCase<Name>;

export type TCommandOptions<
  Opts extends readonly ICommandOptionDefinition[] = readonly ICommandOptionDefinition[],
> = {
  [O in Opts[number] as TCleanName<O['name']>]: O extends { defaultValue: infer D }
    ? D extends string | number | boolean
      ? D
      : string
    : O extends { required: true }
      ? string
      : string | undefined;
};

export interface ICommandDefinition<
  Opts extends readonly ICommandOptionDefinition[] = readonly ICommandOptionDefinition[],
> {
  name: string;
  description: string;
  options?: Opts;
  execute(options: TCommandOptions<Opts>, context: IProjectContext): Promise<void>;
  steps?: Array<{ id: string; label: string }>;
}

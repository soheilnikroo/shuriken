export interface IPrompt {
  confirm(message: string): Promise<boolean>;
  select<T>(message: string, choices: Array<T & { display?: string }>): Promise<T>;
  input(message: string): Promise<string>;
}

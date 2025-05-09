export interface IProjectContext {
  isTS: boolean;
  projectType: 'next' | 'react' | 'vite' | 'other';
  nodeEngine?: string;
  installedWithShuriken: Record<string, string>;
  hasStorybook?: boolean;
  hasUnitTests?: boolean;
}

import { FileService } from '@/core/file';
import { Logger } from '@/core/logger';

const fs = new FileService(new Logger({ logLevel: 'info' }));

export enum EProjectType {
  Next = 'next',
  React = 'react',
  Vite = 'vite',
  Other = 'other',
}

export async function detectProjectType(): Promise<EProjectType> {
  if (fs.exists('next.config.js') || fs.exists('next.config.mjs')) {
    return EProjectType.Next;
  }
  if (fs.exists('vite.config.ts') || fs.exists('vite.config.js')) {
    return EProjectType.Vite;
  }

  let pkg: {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
    scripts?: Record<string, string>;
  } = {};
  try {
    pkg = await fs.readJson('package.json');
  } catch {}

  if (pkg.dependencies?.next || pkg.devDependencies?.next) {
    return EProjectType.Next;
  }
  if (
    (pkg.scripts?.dev && pkg.scripts.dev.includes('vite')) ||
    pkg.dependencies?.vite ||
    pkg.devDependencies?.vite
  ) {
    return EProjectType.Vite;
  }
  if (pkg.dependencies?.['react-scripts'] || pkg.devDependencies?.['react-scripts']) {
    return EProjectType.React;
  }

  return EProjectType.Other;
}

import { ProcessService } from '@/core/process';

import { jarvisLogger } from './logger';

export const ps = new ProcessService(jarvisLogger);

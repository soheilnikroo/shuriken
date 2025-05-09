import { FileService } from '@/core/file';

import { jarvisLogger } from './logger';

export const fs = new FileService(jarvisLogger);

import { Logger } from '@/core/logger';

export const jarvisLogger = new Logger({
  logLevel: 'info',
  loggerOptions: {
    useColors: true,
    useFunPrefixes: true,
  },
}).child('jarvis');

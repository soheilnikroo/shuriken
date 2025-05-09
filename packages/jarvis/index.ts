import type { IPackageDefinition } from '@/types';

import createCompoenentCommand from './commands/component';

const packageDefinition: IPackageDefinition = {
  metadata: {
    name: 'jarvis',
    version: '1.0.0',
    description: 'your AI butler that whips up component templates on demand! 🤖🛠️',
  },
  commands: [createCompoenentCommand],
};

export default packageDefinition;

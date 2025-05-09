import { injectable, inject } from 'inversify';

import { CommandManager } from '@/core/command-manager';
import { Logger } from '@/core/logger';
import { PackageManager } from '@/core/package-manager';
import { TYPES } from '@/core/types';
import type { ICommandDefinition, TCommandOptions } from '@/types';
import { DiagramRenderer } from '@/utils/diagram-renderer';
import type { TFlowGraph } from '@/utils/flow-builder';
import { CommandFlowBuilder } from '@/utils/flow-builder';

@injectable()
export class DocsCommand implements ICommandDefinition {
  name = 'docs:diagrams';
  description = 'Auto-generate flowcharts for each package command';
  options = [
    {
      name: '--format <fmt>',
      description: 'Output format: mermaid|dot|drawio',
      defaultValue: 'mermaid',
    },
    {
      name: '--out-dir <dir>',
      description: 'Directory to write diagrams',
      defaultValue: 'docs/diagrams',
    },
  ] as const;

  constructor(
    @inject(TYPES.PackageManager) private packageManager: PackageManager,
    @inject(TYPES.CommandManager) private commandManager: CommandManager,
    @inject(TYPES.Logger) private logger: Logger
  ) {}

  async execute(options: TCommandOptions): Promise<void> {
    const format = options.format as 'mermaid' | 'dot' | 'drawio';
    const outDir = options['out-dir'] as string;
    const pkgs = await this.packageManager.listAvailablePackages();

    for (const pkg of pkgs) {
      const def = await this.packageManager.getPackage(pkg);
      if (!def) {
        this.logger.warn(`Skipping ${pkg}: definition not found`);
        continue;
      }

      await this.commandManager.loadPackageCommands(pkg);

      for (const cmdDef of def.commands) {
        this.logger.info(`Generating diagram for ${pkg}:${cmdDef.name}`);
        const graph: TFlowGraph = CommandFlowBuilder.build(pkg, cmdDef);
        const renderer = new DiagramRenderer(format, outDir);
        await renderer.render(
          /* name: */ `${pkg.replace(/\//g, '_')}.${cmdDef.name}`,
          /* graph:*/ graph
        );
      }
    }

    this.logger.success('✅ All diagrams generated');
  }
}

export default DocsCommand;

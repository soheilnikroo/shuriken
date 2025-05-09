import type { ICommandDefinition } from '@/types';

export type TFlowGraph = {
  nodes: { id: string; label: string }[];
  edges: { from: string; to: string; label?: string }[];
};

export class CommandFlowBuilder {
  static build(_pkg: string, cmd: ICommandDefinition): TFlowGraph {
    const nodes = [
      { id: 'start', label: 'Start' },
      { id: 'parseOpts', label: 'Parse options' },
      { id: 'success', label: 'Done' },
      { id: 'error', label: 'Log & exit(1)' },
    ];
    const edges: { from: string; to: string; label?: string }[] = [
      { from: 'start', to: 'parseOpts' },
    ];
    if (cmd.steps && cmd.steps.length > 0) {
      // Add nodes for each step
      cmd.steps.forEach(step => {
        nodes.push({ id: step.id, label: step.label });
      });
      // Connect Parse options to the first step
      edges.push({ from: 'parseOpts', to: cmd.steps[0].id });
      // Connect steps sequentially
      for (let i = 0; i < cmd.steps.length - 1; i++) {
        edges.push({ from: cmd.steps[i].id, to: cmd.steps[i + 1].id });
      }
      // Connect the last step to Done
      edges.push({ from: cmd.steps[cmd.steps.length - 1].id, to: 'success' });
      // Add error edges from each step to Log & exit(1)
      cmd.steps.forEach(step => {
        edges.push({ from: step.id, to: 'error', label: 'error' });
      });
      // Add error edge from Parse options
      edges.push({ from: 'parseOpts', to: 'error', label: 'error' });
    } else {
      // Fallback to simple graph
      nodes.push({ id: 'execute', label: `execute() → ${cmd.name}` });
      edges.push({ from: 'parseOpts', to: 'execute' });
      edges.push({ from: 'execute', to: 'success', label: 'fulfilled' });
      edges.push({ from: 'execute', to: 'error', label: 'rejected' });
    }

    return { nodes, edges };
  }
}

import { exec as _exec } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import util from 'util';
import zlib from 'zlib';

import type { TFlowGraph } from './flow-builder';

const exec = util.promisify(_exec);

export class DiagramRenderer {
  constructor(
    private format: 'mermaid' | 'dot' | 'drawio',
    private outDir: string
  ) {}

  private escapeXmlAttribute(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  async render(name: string, graph: TFlowGraph): Promise<void> {
    await fs.mkdir(this.outDir, { recursive: true });
    const base = name.replace(/[\\/:]/g, '_');
    const outPath = (ext: string) => path.join(this.outDir, `${base}.${ext}`);

    if (this.format === 'mermaid') {
      const lines = ['```mermaid', 'flowchart TD'];
      graph.nodes.forEach(n => lines.push(`  ${n.id}[${n.label}]`));
      graph.edges.forEach(e => {
        const lbl = e.label ? `|${e.label}|` : '';
        lines.push(`  ${e.from} -->${lbl} ${e.to}`);
      });
      lines.push('```');
      await fs.writeFile(outPath('mmd'), lines.join('\n'), 'utf8');
      try {
        await exec(`mmdc -i ${outPath('mmd')} -o ${outPath('svg')}`);
      } catch {}
    } else if (this.format === 'dot') {
      const lines = ['digraph G {'];
      graph.nodes.forEach(n => lines.push(`  ${n.id} [label=\"${n.label}\"];`));
      graph.edges.forEach(e => {
        const lbl = e.label ? ` [label=\"${e.label}\"]` : '';
        lines.push(`  ${e.from} -> ${e.to}${lbl};`);
      });
      lines.push('}');
      await fs.writeFile(outPath('dot'), lines.join('\n'), 'utf8');
      try {
        await exec(`dot -Tsvg ${outPath('dot')} -o ${outPath('svg')}`);
      } catch {}
    } else {
      const cells: string[] = [];
      graph.nodes.forEach((n, i) => {
        cells.push(
          `<mxCell id="node${i}" value="${this.escapeXmlAttribute(n.label)}" ` +
            `style="shape=rectangle;rounded=1;whiteSpace=wrap;" vertex="1" parent="1">` +
            `<mxGeometry x="${100 + i * 180}" y="100" ` +
            `width="140" height="60" as="geometry"/>` +
            `</mxCell>`
        );
      });
      graph.edges.forEach((e, i) => {
        const fromIdx = graph.nodes.findIndex(n => n.id === e.from);
        const toIdx = graph.nodes.findIndex(n => n.id === e.to);
        if (fromIdx >= 0 && toIdx >= 0) {
          const lblAttr = e.label ? ` value="${this.escapeXmlAttribute(e.label)}"` : '';
          cells.push(
            `<mxCell id="edge${i}" edge="1" parent="1" ` +
              `source="node${fromIdx}" target="node${toIdx}"${lblAttr}>` +
              `<mxGeometry relative="1" as="geometry"/>` +
              `</mxCell>`
          );
        }
      });
      const xmlModel = `<mxGraphModel><root><mxCell id="0"/><mxCell id="1" parent="0"/>${cells.join(
        ''
      )}</root></mxGraphModel>`;

      const uri = encodeURIComponent(xmlModel);
      const compressed = zlib.deflateRawSync(Buffer.from(uri, 'utf8'));
      const data = compressed.toString('base64');

      const mxfile =
        `<?xml version="1.0" encoding="UTF-8"?>\n` +
        `<mxfile host="app.diagrams.net">\n` +
        `<diagram id="${base}" name="${base}">${data}</diagram>\n` +
        `</mxfile>`;

      await fs.writeFile(outPath('drawio'), mxfile, 'utf8');
    }
  }
}

import {BUILT_IN_TEMPLATES} from "./builtInTemplates";

describe('BUILT_IN_TEMPLATES', () => {
  it('has unique keys per kind', () => {
    const keys = BUILT_IN_TEMPLATES.map((template) => `${template.kind}:${template.key}`);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('ships the page templates as HTML documents', () => {
    const pages = BUILT_IN_TEMPLATES.filter((template) => template.kind === 'page');

    expect(pages.length).toBe(4);
    pages.forEach((template) => expect(template.content).toMatch(/^<h1>/));
  });

  it('ships diagram templates whose edges connect existing nodes', () => {
    const diagrams = BUILT_IN_TEMPLATES.filter((template) => template.kind === 'diagram');

    expect(diagrams.length).toBe(3);
    diagrams.forEach((template) => {
      const cells: { id: string; shape: string; source?: { cell: string }; target?: { cell: string } }[] = JSON.parse(template.content).cells;
      const nodeIds = new Set(cells.filter((cell) => cell.shape !== 'edge').map((cell) => cell.id));
      const edges = cells.filter((cell) => cell.shape === 'edge');

      expect(nodeIds.size).toBeGreaterThan(0);
      edges.forEach((edge) => {
        expect(nodeIds.has(edge.source!.cell)).toBeTrue();
        expect(nodeIds.has(edge.target!.cell)).toBeTrue();
      });
    });
  });
});

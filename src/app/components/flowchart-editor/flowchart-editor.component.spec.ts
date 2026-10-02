import {ComponentFixture, TestBed} from '@angular/core/testing';
import {TranslateModule} from '@ngx-translate/core';
import {Graph} from '@antv/x6';
import {FlowchartEditorComponent} from './flowchart-editor.component';
import {PHRASES} from '@config/phrases';

function fireMouse(target: EventTarget, type: string, x: number, y: number) {
  target.dispatchEvent(new MouseEvent(type, {bubbles: true, cancelable: true, clientX: x, clientY: y, view: window}));
}

describe('FlowchartEditorComponent', () => {
  let fixture: ComponentFixture<FlowchartEditorComponent>;
  let component: FlowchartEditorComponent;

  function getGraph(): Graph {
    return (component as any).graph;
  }

  async function waitForRender() {
    await new Promise<void>((resolve) => setTimeout(resolve, 100));
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FlowchartEditorComponent, TranslateModule.forRoot()],
    }).compileComponents();

    fixture = TestBed.createComponent(FlowchartEditorComponent);
    component = fixture.componentInstance;
    document.body.appendChild(fixture.nativeElement);
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture.nativeElement.remove();
    fixture.destroy();
  });

  describe('placing shapes', () => {
    it('adds a node to the canvas with the expected shape and label', () => {
      component.handleAddShape('flow-process');

      const nodes = getGraph().getNodes();
      expect(nodes.length).toBe(1);
      expect(nodes[0].shape).toBe('flow-process');
      expect(nodes[0].getAttrByPath('text/text')).toBe(PHRASES.FLOWCHART_PROCESS);
    });

    it('adds each shape type independently without replacing previous ones', () => {
      component.handleAddShape('flow-terminator');
      component.handleAddShape('flow-process');
      component.handleAddShape('flow-decision');
      component.handleAddShape('flow-io');

      const shapes = getGraph().getNodes().map((node) => node.shape);
      expect(shapes.sort()).toEqual(['flow-decision', 'flow-io', 'flow-process', 'flow-terminator']);
    });

    it('marks the canvas as no longer empty once a shape is placed', () => {
      expect(component.isEmpty).toBeTrue();

      component.handleAddShape('flow-process');

      expect(component.isEmpty).toBeFalse();
    });
  });

  describe('renaming shapes', () => {
    it('updates the node label when the inline editor is committed', () => {
      component.handleAddShape('flow-process');
      const node = getGraph().getNodes()[0];

      (component as any).openLabelEditor('node', node);
      expect(component.editingLabel).not.toBeNull();

      component.editingLabel!.value = 'Reviewed';
      component.handleLabelInputBlur();

      expect(node.getAttrByPath('text/text')).toBe('Reviewed');
      expect(component.editingLabel).toBeNull();
    });

    it('commits the rename on Enter', () => {
      component.handleAddShape('flow-process');
      const node = getGraph().getNodes()[0];

      (component as any).openLabelEditor('node', node);
      component.editingLabel!.value = 'Approved';
      component.handleLabelInputKeydown({key: 'Enter', preventDefault: () => {}} as KeyboardEvent);

      expect(node.getAttrByPath('text/text')).toBe('Approved');
      expect(component.editingLabel).toBeNull();
    });

    it('discards the draft and leaves the label untouched on Escape', () => {
      component.handleAddShape('flow-process');
      const node = getGraph().getNodes()[0];
      const originalLabel = node.getAttrByPath('text/text');

      (component as any).openLabelEditor('node', node);
      component.editingLabel!.value = 'Should not stick';
      component.handleLabelInputKeydown({key: 'Escape', preventDefault: () => {}} as KeyboardEvent);

      expect(component.editingLabel).toBeNull();
      expect(node.getAttrByPath('text/text')).toBe(originalLabel);
    });

    it('renames an edge label the same way as a node label', () => {
      component.handleAddShape('flow-terminator');
      component.handleAddShape('flow-process');
      const [source, target] = getGraph().getNodes();
      const edge = getGraph().addEdge({source: source.id, target: target.id});

      (component as any).openLabelEditor('edge', edge);
      component.editingLabel!.value = 'yes';
      component.handleLabelInputBlur();

      expect(String(edge.getLabelAt(0)?.['attrs']?.['label']?.['text'])).toBe('yes');
    });
  });

  describe('connecting shapes', () => {
    it('creates an edge between two placed shapes', () => {
      component.handleAddShape('flow-terminator');
      component.handleAddShape('flow-process');
      const [source, target] = getGraph().getNodes();

      const edge = getGraph().addEdge({source: source.id, target: target.id});

      expect(getGraph().getEdges().length).toBe(1);
      expect(edge.getSourceCellId()).toBe(source.id);
      expect(edge.getTargetCellId()).toBe(target.id);
    });

    it('allows connecting two distinct shapes per the connection validator', () => {
      component.handleAddShape('flow-terminator');
      component.handleAddShape('flow-process');
      const [a, b] = getGraph().getNodes();

      const validateConnection = (getGraph().options.connecting as any).validateConnection;
      expect(validateConnection({sourceCell: a, targetCell: b})).toBeTrue();
    });

    it('rejects connecting a shape to itself per the connection validator', () => {
      component.handleAddShape('flow-process');
      const [node] = getGraph().getNodes();

      const validateConnection = (getGraph().options.connecting as any).validateConnection;
      expect(validateConnection({sourceCell: node, targetCell: node})).toBeFalse();
    });

    it('rejects a connection with no source cell per the connection validator', () => {
      component.handleAddShape('flow-process');
      const [node] = getGraph().getNodes();

      const validateConnection = (getGraph().options.connecting as any).validateConnection;
      expect(validateConnection({sourceCell: null, targetCell: node})).toBeFalse();
    });

    it('creates a rendered edge when dragging from a port to another shape, like a user would', async () => {
      component.handleAddShape('flow-terminator');
      component.handleAddShape('flow-process');
      await waitForRender();

      const graph = getGraph();
      const [, target] = graph.getNodes();
      const hostEl: HTMLElement = (component as any).canvasHost.nativeElement;
      const sourcePort = hostEl.querySelectorAll('.x6-port-body')[1] as SVGCircleElement;
      const sourceRect = sourcePort.getBoundingClientRect();
      const targetClientRect = graph.localToClient(target.getBBox());
      const targetEl = graph.findViewByCell(target)!.container;

      const startX = sourceRect.left + sourceRect.width / 2;
      const startY = sourceRect.top + sourceRect.height / 2;
      const endX = targetClientRect.x + targetClientRect.width / 2;
      const endY = targetClientRect.y + targetClientRect.height / 2;

      fireMouse(sourcePort, 'mousedown', startX, startY);
      fireMouse(targetEl, 'mousemove', (startX + endX) / 2, (startY + endY) / 2);
      fireMouse(targetEl, 'mousemove', endX, endY);
      fireMouse(targetEl, 'mouseup', endX, endY);
      await waitForRender();

      expect(graph.getEdges().length).toBe(1);
      expect(hostEl.querySelector('.x6-edge')).not.toBeNull();
    });

    it('renders connection ports without an inline visibility override, so the hover CSS can reveal them', async () => {
      component.handleAddShape('flow-process');
      await waitForRender();

      const hostEl: HTMLElement = (component as any).canvasHost.nativeElement;
      const portCircle = hostEl.querySelector('.x6-port-body') as SVGCircleElement | null;

      expect(portCircle).not.toBeNull();
      expect(portCircle!.style.visibility).toBe('');
    });
  });
});

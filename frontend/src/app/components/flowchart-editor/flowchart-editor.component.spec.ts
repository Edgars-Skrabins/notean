import {SimpleChange} from '@angular/core';
import {ComponentFixture, TestBed} from '@angular/core/testing';
import {provideTranslateService} from '@ngx-translate/core';
import {Graph} from '@antv/x6';
import {FlowchartEditorComponent} from './flowchart-editor.component';
import {PHRASES} from '@config/phrases';
import {ThemeService} from '@services/theme.service';

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
      imports: [FlowchartEditorComponent],
      providers: [provideTranslateService()],
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

  describe('mapping comment pin points', () => {
    it('maps a local point to the canvas and back through pan and zoom', () => {
      const graph = getGraph();
      graph.zoomTo(2);
      graph.translate(30, 10);
      const canvasPoint = component.localToCanvas(50, 40)!;
      const rect = graph.container.getBoundingClientRect();

      const localPoint = component.clientToLocal(rect.left + canvasPoint.x, rect.top + canvasPoint.y)!;

      expect(canvasPoint).toEqual({x: 130, y: 90});
      expect(localPoint.x).toBeCloseTo(50);
      expect(localPoint.y).toBeCloseTo(40);
    });

    it('emits viewportChange when the canvas pans or zooms', () => {
      const viewportChange = spyOn(component.viewportChange, 'emit');

      getGraph().translate(20, 0);
      expect(viewportChange).toHaveBeenCalled();

      viewportChange.calls.reset();
      getGraph().zoomTo(1.5);
      expect(viewportChange).toHaveBeenCalled();
    });
  });

  describe('clearing the selection on Escape', () => {
    function escapeEvent(): KeyboardEvent {
      return new KeyboardEvent('keydown', {key: 'Escape', cancelable: true});
    }

    it('clears a selection and consumes Esc', () => {
      component.handleAddShape('flow-process');
      getGraph().select(getGraph().getNodes()[0]);
      const event = escapeEvent();

      component.handleClearSelection(event);

      expect(getGraph().getSelectedCells().length).toBe(0);
      expect(event.defaultPrevented).toBeTrue();
    });

    it('leaves Esc to the popup when nothing is selected', () => {
      const event = escapeEvent();

      component.handleClearSelection(event);

      expect(event.defaultPrevented).toBeFalse();
    });

    it('leaves the selection to the label editor while a label is being edited', () => {
      component.handleAddShape('flow-process');
      const node = getGraph().getNodes()[0];
      getGraph().select(node);
      (component as any).openLabelEditor('node', node);
      const event = escapeEvent();

      component.handleClearSelection(event);

      expect(getGraph().getSelectedCells().length).toBe(1);
      expect(event.defaultPrevented).toBeFalse();
    });
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

    it('hides the shape\'s own label while editing, so it cannot show through the input and look duplicated', () => {
      component.handleAddShape('flow-process');
      const node = getGraph().getNodes()[0];
      expect(node.getAttrByPath('text/text')).toBe(PHRASES.FLOWCHART_PROCESS);

      (component as any).openLabelEditor('node', node);

      expect(node.getAttrByPath('text/text')).toBe('');
      expect(component.editingLabel!.value).toBe(PHRASES.FLOWCHART_PROCESS);
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

  describe('theme colours', () => {
    const root = document.documentElement;
    let savedTheme: string | null;
    let savedMode: string | null;

    function restore(name: string, value: string | null) {
      if (value === null) {
        root.removeAttribute(name);
      } else {
        root.setAttribute(name, value);
      }
    }

    beforeEach(() => {
      savedTheme = root.getAttribute('data-theme');
      savedMode = root.getAttribute('data-mode');
      TestBed.inject(ThemeService).preview('graphite', 'dark');
    });

    afterEach(() => {
      restore('data-theme', savedTheme);
      restore('data-mode', savedMode);
    });

    it('colours new nodes and edges from the active theme', () => {
      component.handleAddShape('flow-process');
      component.handleAddShape('flow-decision');
      const [first, second] = getGraph().getNodes();
      const edge = getGraph().addEdge({source: first, target: second});

      expect(first.getAttrByPath('body/stroke')).toBe('#aeb6fa');
      expect(first.getAttrByPath('text/fill')).toBe('#0f1012');
      expect(edge.getAttrByPath('line/stroke')).toBe('#8b8f98');
    });

    it('recolours existing cells and the gradient live without emitting content', () => {
      component.handleAddShape('flow-process');
      const node = getGraph().getNodes()[0];
      const emitted: string[] = [];
      component.contentChange.subscribe((content) => emitted.push(content));

      TestBed.inject(ThemeService).preview('paper', 'light');

      expect(node.getAttrByPath('body/stroke')).toBe('#3a5a85');
      expect(node.getAttrByPath('text/fill')).toBe('#ffffff');
      const stops = fixture.nativeElement.querySelectorAll('#flowchartNodeFill stop');
      expect(stops[0].getAttribute('stop-color')).toBe('#1f3a5f');
      expect(stops[1].getAttribute('stop-color')).toBe('#3a5a85');
      expect(emitted).toEqual([]);
    });

    it('recolours loaded content that carries old colours', () => {
      component.handleAddShape('flow-process');
      getGraph().getNodes()[0].setAttrs({body: {stroke: '#9c6bff'}, text: {fill: '#ffffff'}});
      const content = JSON.stringify(getGraph().toJSON());
      getGraph().clearCells();

      component.content = content;
      component.ngOnChanges({content: new SimpleChange('', content, false)});

      const node = getGraph().getNodes()[0];
      expect(node.getAttrByPath('body/stroke')).toBe('#aeb6fa');
      expect(node.getAttrByPath('text/fill')).toBe('#0f1012');
    });
  });
});

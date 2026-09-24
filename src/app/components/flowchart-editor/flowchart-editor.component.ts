import {AfterViewInit, Component, ElementRef, EventEmitter, Input, OnChanges, OnDestroy, Output, SimpleChanges, ViewChild, ViewEncapsulation} from '@angular/core';
import {NgIf} from "@angular/common";
import {FormsModule} from "@angular/forms";
import {TranslateModule, TranslateService} from "@ngx-translate/core";
import {Graph, Node, Edge} from '@antv/x6';
import {Selection} from '@antv/x6-plugin-selection';
import {Snapline} from '@antv/x6-plugin-snapline';
import {Keyboard} from '@antv/x6-plugin-keyboard';
import {PHRASES} from "@config/phrases";
import {IconButtonComponent} from "@components/icon-button/icon-button.component";

const GRADIENT_ID = 'flowchartNodeFill';

let shapesRegistered = false;

function registerShapes() {
  if (shapesRegistered) {
    return;
  }
  shapesRegistered = true;

  const bodyAttrs = {
    fill: `url(#${GRADIENT_ID})`,
    stroke: '#9c6bff',
    strokeWidth: 1.5,
  };

  const textAttrs = {
    fill: '#ffffff',
    fontSize: 13,
    fontWeight: 600,
    fontFamily: 'inherit',
  };

  Graph.registerNode('flow-terminator', {
    inherit: 'ellipse',
    width: 140,
    height: 56,
    attrs: {
      body: bodyAttrs,
      text: textAttrs,
    },
    ports: PORTS,
  });

  Graph.registerNode('flow-process', {
    inherit: 'rect',
    width: 160,
    height: 64,
    attrs: {
      body: {...bodyAttrs, rx: 10, ry: 10},
      text: textAttrs,
    },
    ports: PORTS,
  });

  Graph.registerNode('flow-decision', {
    inherit: 'polygon',
    width: 150,
    height: 90,
    attrs: {
      body: {...bodyAttrs, refPoints: '75,0 150,45 75,90 0,45'},
      text: textAttrs,
    },
    ports: PORTS,
  });

  Graph.registerNode('flow-io', {
    inherit: 'polygon',
    width: 160,
    height: 64,
    attrs: {
      body: {...bodyAttrs, refPoints: '20,0 160,0 140,64 0,64'},
      text: textAttrs,
    },
    ports: PORTS,
  });
}

const PORT_ATTRS = {
  circle: {
    r: 4,
    magnet: true,
    stroke: '#9c6bff',
    strokeWidth: 1.5,
    fill: '#1b1042',
    style: {visibility: 'hidden'},
  },
};

const PORTS = {
  groups: {
    top: {position: 'top', attrs: PORT_ATTRS},
    right: {position: 'right', attrs: PORT_ATTRS},
    bottom: {position: 'bottom', attrs: PORT_ATTRS},
    left: {position: 'left', attrs: PORT_ATTRS},
  },
  items: [
    {group: 'top'},
    {group: 'right'},
    {group: 'bottom'},
    {group: 'left'},
  ],
};

interface EditingLabel {
  kind: 'node' | 'edge';
  cell: Node | Edge;
  value: string;
  top: number;
  left: number;
  width: number;
}

@Component({
  selector: 'app-flowchart-editor',
  standalone: true,
  imports: [
    NgIf,
    FormsModule,
    TranslateModule,
    IconButtonComponent
  ],
  templateUrl: './flowchart-editor.component.html',
  styleUrl: './flowchart-editor.component.css',
  encapsulation: ViewEncapsulation.None
})
export class FlowchartEditorComponent implements AfterViewInit, OnChanges, OnDestroy {
  protected readonly PHRASES = PHRASES;

  @Input() content = '';
  @Input() editable = true;
  @Output() contentChange = new EventEmitter<string>();

  @ViewChild('canvasHost', {static: true}) canvasHost!: ElementRef<HTMLDivElement>;

  isEmpty = true;
  editingLabel: EditingLabel | null = null;

  private graph: Graph | null = null;
  private nextNodeOffset = 0;
  private lastEmittedContent: string | null = null;

  constructor(private translateService: TranslateService) {
  }

  ngAfterViewInit() {
    registerShapes();

    const graph = new Graph({
      container: this.canvasHost.nativeElement,
      autoResize: true,
      panning: true,
      mousewheel: {enabled: true, modifiers: ['ctrl', 'meta']},
      interacting: () => this.editable,
      grid: {visible: true, type: 'dot', size: 16, args: {color: 'rgba(255,255,255,0.12)', thickness: 1}},
      connecting: {
        router: 'orthogonal',
        connector: {name: 'rounded', args: {radius: 8}},
        anchor: 'center',
        connectionPoint: 'boundary',
        allowBlank: false,
        allowLoop: false,
        highlight: true,
        snap: {radius: 20},
        createEdge() {
          return this.createEdge({
            shape: 'edge',
            attrs: {
              line: {
                stroke: '#a9a3d1',
                strokeWidth: 2,
                targetMarker: {name: 'block', width: 8, height: 6},
              },
            },
            zIndex: 0,
          });
        },
        validateConnection: ({sourceCell, targetCell}) => !!sourceCell && sourceCell !== targetCell,
      },
    });
    this.graph = graph;

    this.injectGradientDef();

    graph.use(new Selection({enabled: true, multiple: true, rubberband: true, showNodeSelectionBox: true, showEdgeSelectionBox: true}));
    graph.use(new Snapline({enabled: true, sharp: true}));
    graph.use(new Keyboard({enabled: true}));

    graph.bindKey(['backspace', 'delete'], () => {
      if (!this.editable) {
        return;
      }
      const selected = graph.getSelectedCells();
      if (selected.length) {
        graph.removeCells(selected);
      }
    });

    graph.on('cell:added', () => this.handleGraphChange());
    graph.on('cell:removed', () => this.handleGraphChange());
    graph.on('cell:changed', () => this.handleGraphChange());

    graph.on('node:dblclick', ({node, e}) => {
      if (!this.editable) {
        return;
      }
      e.stopPropagation();
      this.openLabelEditor('node', node);
    });

    graph.on('edge:dblclick', ({edge, e}) => {
      if (!this.editable) {
        return;
      }
      e.stopPropagation();
      this.openLabelEditor('edge', edge);
    });

    this.loadContent();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (
      changes['content'] &&
      this.graph &&
      !changes['content'].isFirstChange() &&
      changes['content'].currentValue !== this.lastEmittedContent
    ) {
      this.loadContent();
    }
  }

  ngOnDestroy() {
    this.graph?.dispose();
    this.graph = null;
  }

  handleAddShape(shape: 'flow-terminator' | 'flow-process' | 'flow-decision' | 'flow-io') {
    if (!this.graph) {
      return;
    }

    const labelKey: Record<typeof shape, string> = {
      'flow-terminator': PHRASES.FLOWCHART_START_END,
      'flow-process': PHRASES.FLOWCHART_PROCESS,
      'flow-decision': PHRASES.FLOWCHART_DECISION,
      'flow-io': PHRASES.FLOWCHART_INPUT_OUTPUT,
    };

    const offset = this.nextNodeOffset++;
    this.graph.addNode({
      shape,
      x: 80 + (offset % 6) * 40,
      y: 60 + Math.floor(offset / 6) * 40,
      label: this.translateService.instant(labelKey[shape]),
    });
  }

  handleDeleteSelected() {
    if (!this.graph) {
      return;
    }
    const selected = this.graph.getSelectedCells();
    if (selected.length) {
      this.graph.removeCells(selected);
    }
  }

  handleZoomToFit() {
    this.graph?.zoomToFit({padding: 24, maxScale: 1});
  }

  handleLabelInputBlur() {
    this.commitLabelEditor();
  }

  handleLabelInputKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      event.preventDefault();
      this.commitLabelEditor();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      this.editingLabel = null;
    }
  }

  private openLabelEditor(kind: 'node' | 'edge', cell: Node | Edge) {
    if (!this.graph) {
      return;
    }

    const rect = this.graph.localToClient(cell.getBBox());
    const hostRect = this.canvasHost.nativeElement.getBoundingClientRect();

    this.editingLabel = {
      kind,
      cell,
      value: kind === 'node'
        ? (cell as Node).getAttrByPath<string>('text/text') ?? ''
        : String((cell as Edge).getLabelAt(0)?.['attrs']?.['label']?.['text'] ?? ''),
      top: rect.y - hostRect.top + rect.height / 2 - 14,
      left: rect.x - hostRect.left + rect.width / 2 - 60,
      width: 120,
    };
  }

  private commitLabelEditor() {
    if (!this.editingLabel) {
      return;
    }

    const {kind, cell, value} = this.editingLabel;
    if (kind === 'node') {
      (cell as Node).setAttrByPath('text/text', value);
    } else {
      (cell as Edge).setLabels(value ? [value] : []);
    }

    this.editingLabel = null;
  }

  private loadContent() {
    if (!this.graph) {
      return;
    }

    this.graph.clearCells();

    if (this.content) {
      try {
        this.graph.fromJSON(JSON.parse(this.content));
      } catch {
        // ignore malformed content and start from a blank canvas
      }
    }

    this.isEmpty = this.graph.getCells().length === 0;
  }

  private handleGraphChange() {
    if (!this.graph) {
      return;
    }
    this.isEmpty = this.graph.getCells().length === 0;
    const content = JSON.stringify(this.graph.toJSON());
    this.lastEmittedContent = content;
    this.contentChange.emit(content);
  }

  private injectGradientDef() {
    const svg = this.canvasHost.nativeElement.querySelector('svg');
    if (!svg || svg.querySelector(`#${GRADIENT_ID}`)) {
      return;
    }

    const svgNs = 'http://www.w3.org/2000/svg';
    const defs = svg.querySelector('defs') ?? svg.insertBefore(document.createElementNS(svgNs, 'defs'), svg.firstChild);

    const gradient = document.createElementNS(svgNs, 'linearGradient');
    gradient.setAttribute('id', GRADIENT_ID);
    gradient.setAttribute('x1', '0%');
    gradient.setAttribute('y1', '0%');
    gradient.setAttribute('x2', '100%');
    gradient.setAttribute('y2', '100%');

    const stop1 = document.createElementNS(svgNs, 'stop');
    stop1.setAttribute('offset', '0%');
    stop1.setAttribute('stop-color', '#5a2fe6');

    const stop2 = document.createElementNS(svgNs, 'stop');
    stop2.setAttribute('offset', '100%');
    stop2.setAttribute('stop-color', '#9c6bff');

    gradient.appendChild(stop1);
    gradient.appendChild(stop2);
    defs.appendChild(gradient);
  }
}

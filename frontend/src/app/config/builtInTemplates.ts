import {BuiltInTemplate} from "@models/template.model";

type FlowShape = 'flow-terminator' | 'flow-process' | 'flow-decision' | 'flow-io';

interface FlowNode {
  id: string;
  shape: FlowShape;
  x: number;
  y: number;
  label: string;
}

interface FlowEdge {
  source: string;
  target: string;
  label?: string;
  vertices?: { x: number; y: number }[];
}

function flowchart(nodes: FlowNode[], edges: FlowEdge[]): string {
  const nodeCells = nodes.map(({id, shape, x, y, label}) => ({id, shape, x, y, label}));
  const edgeCells = edges.map(({source, target, label, vertices}, index) => ({
    id: `edge-${index}`,
    shape: 'edge',
    source: {cell: source},
    target: {cell: target},
    vertices: vertices ?? [],
    router: {name: 'orth'},
    connector: {name: 'rounded', args: {radius: 8}},
    attrs: {line: {strokeWidth: 2, targetMarker: {name: 'block', width: 8, height: 6}}},
    labels: label ? [label] : [],
    zIndex: 0,
  }));
  return JSON.stringify({cells: [...nodeCells, ...edgeCells]});
}

const FEATURE_DOCUMENTATION = [
  '<h1>Feature name</h1>',
  '<p><strong>Status:</strong> Draft · <strong>Owner:</strong> Name · <strong>Last updated:</strong> Date</p>',
  '<h2>Summary</h2>',
  '<p>One or two sentences on what this feature does and who it is for.</p>',
  '<h2>Problem</h2>',
  '<p>What users struggle with today, and why it matters.</p>',
  '<h2>Goals</h2>',
  '<ul><li><p>Goal one</p></li><li><p>Goal two</p></li></ul>',
  '<h2>Non-goals</h2>',
  '<ul><li><p>What this feature deliberately does not cover</p></li></ul>',
  '<h2>How it works</h2>',
  '<ol><li><p>The user does this</p></li><li><p>The system responds with that</p></li></ol>',
  '<h2>Edge cases</h2>',
  '<ul><li><p>Empty, error and permission cases</p></li></ul>',
  '<h2>Open questions</h2>',
  '<ul><li><p>Question</p></li></ul>',
].join('');

const MEETING_NOTES = [
  '<h1>Meeting notes</h1>',
  '<p><strong>Date:</strong> Date · <strong>Facilitator:</strong> Name</p>',
  '<h2>Attendees</h2>',
  '<ul><li><p>Name</p></li></ul>',
  '<h2>Agenda</h2>',
  '<ol><li><p>Topic</p></li><li><p>Topic</p></li></ol>',
  '<h2>Notes</h2>',
  '<p>Key points discussed.</p>',
  '<h2>Decisions</h2>',
  '<ul><li><p>Decision</p></li></ul>',
  '<h2>Action items</h2>',
  '<ul><li><p><strong>Owner</strong> — task, due date</p></li></ul>',
].join('');

const CONCEPT = [
  '<h1>Concept name</h1>',
  '<h2>Idea</h2>',
  '<p>Describe the idea in a short paragraph.</p>',
  '<h2>Why now</h2>',
  '<p>The opportunity or pain point that makes this worth exploring.</p>',
  '<h2>Target audience</h2>',
  '<p>Who benefits and how.</p>',
  '<h2>Approach</h2>',
  '<ul><li><p>Option A</p></li><li><p>Option B</p></li></ul>',
  '<h2>Risks and assumptions</h2>',
  '<ul><li><p>Assumption to validate</p></li></ul>',
  '<h2>Next steps</h2>',
  '<ol><li><p>Step</p></li></ol>',
].join('');

const PERFORMANCE_IMPROVEMENT_PLAN = [
  '<h1>Performance improvement plan</h1>',
  '<p><strong>Employee:</strong> Name · <strong>Manager:</strong> Name · <strong>Period:</strong> Start date – End date</p>',
  '<h2>Purpose</h2>',
  '<p>Why this plan exists and what success looks like at the end of it.</p>',
  '<h2>Areas for improvement</h2>',
  '<ul><li><p>Area, with concrete examples</p></li></ul>',
  '<h2>Expectations and goals</h2>',
  '<ol><li><p>Goal, how it is measured, deadline</p></li></ol>',
  '<h2>Support provided</h2>',
  '<ul><li><p>Training, mentoring or resources</p></li></ul>',
  '<h2>Check-ins</h2>',
  '<ul><li><p>Date — notes</p></li></ul>',
  '<h2>Outcome</h2>',
  '<p>Summary at the end of the period.</p>',
].join('');

const TODO_CHECKLIST = flowchart(
  [
    {id: 'start', shape: 'flow-terminator', x: 80, y: 40, label: 'Start'},
    {id: 'task-1', shape: 'flow-process', x: 70, y: 150, label: 'Task 1'},
    {id: 'task-2', shape: 'flow-process', x: 70, y: 270, label: 'Task 2'},
    {id: 'task-3', shape: 'flow-process', x: 70, y: 390, label: 'Task 3'},
    {id: 'done', shape: 'flow-terminator', x: 80, y: 510, label: 'Done'},
  ],
  [
    {source: 'start', target: 'task-1'},
    {source: 'task-1', target: 'task-2'},
    {source: 'task-2', target: 'task-3'},
    {source: 'task-3', target: 'done'},
  ],
);

const SIMPLE_FLOWCHART = flowchart(
  [
    {id: 'start', shape: 'flow-terminator', x: 80, y: 40, label: 'Start'},
    {id: 'input', shape: 'flow-io', x: 70, y: 150, label: 'Input'},
    {id: 'process', shape: 'flow-process', x: 70, y: 270, label: 'Process'},
    {id: 'check', shape: 'flow-decision', x: 75, y: 390, label: 'OK?'},
    {id: 'fix', shape: 'flow-process', x: 320, y: 403, label: 'Fix'},
    {id: 'end', shape: 'flow-terminator', x: 80, y: 540, label: 'End'},
  ],
  [
    {source: 'start', target: 'input'},
    {source: 'input', target: 'process'},
    {source: 'process', target: 'check'},
    {source: 'check', target: 'end', label: 'Yes'},
    {source: 'check', target: 'fix', label: 'No'},
    {source: 'fix', target: 'process', vertices: [{x: 400, y: 302}]},
  ],
);

const DECISION_TREE = flowchart(
  [
    {id: 'question', shape: 'flow-decision', x: 305, y: 40, label: 'Question?'},
    {id: 'left', shape: 'flow-decision', x: 105, y: 200, label: 'Follow-up?'},
    {id: 'right', shape: 'flow-decision', x: 505, y: 200, label: 'Follow-up?'},
    {id: 'outcome-1', shape: 'flow-process', x: 20, y: 370, label: 'Outcome 1'},
    {id: 'outcome-2', shape: 'flow-process', x: 200, y: 370, label: 'Outcome 2'},
    {id: 'outcome-3', shape: 'flow-process', x: 420, y: 370, label: 'Outcome 3'},
    {id: 'outcome-4', shape: 'flow-process', x: 600, y: 370, label: 'Outcome 4'},
  ],
  [
    {source: 'question', target: 'left', label: 'Yes'},
    {source: 'question', target: 'right', label: 'No'},
    {source: 'left', target: 'outcome-1', label: 'Yes'},
    {source: 'left', target: 'outcome-2', label: 'No'},
    {source: 'right', target: 'outcome-3', label: 'Yes'},
    {source: 'right', target: 'outcome-4', label: 'No'},
  ],
);

export const BUILT_IN_TEMPLATES: readonly BuiltInTemplate[] = [
  {key: 'feature-documentation', kind: 'page', title: 'Feature documentation', content: FEATURE_DOCUMENTATION},
  {key: 'meeting-notes', kind: 'page', title: 'Meeting notes', content: MEETING_NOTES},
  {key: 'concept', kind: 'page', title: 'Concept', content: CONCEPT},
  {key: 'performance-improvement-plan', kind: 'page', title: 'Performance improvement plan', content: PERFORMANCE_IMPROVEMENT_PLAN},
  {key: 'todo-checklist', kind: 'diagram', title: 'To-do checklist', content: TODO_CHECKLIST},
  {key: 'simple-flowchart', kind: 'diagram', title: 'Simple flowchart', content: SIMPLE_FLOWCHART},
  {key: 'decision-tree', kind: 'diagram', title: 'Decision tree', content: DECISION_TREE},
];

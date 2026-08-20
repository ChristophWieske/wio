import { CdkDrag } from '@angular/cdk/drag-drop';
import { Component, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatFormField, MatInput, MatLabel } from '@angular/material/input';
import { MatSlider, MatSliderThumb } from '@angular/material/slider';
import { FlowPath, FlowPathHost, FlowPathNode, Obstacle } from '../../../flow-path/src/public-api';

type DemoPort = {
  id: string;
  side: 'left' | 'right';
};

type DemoNodeCard = {
  eyebrow: string;
  title: string;
  description: string;
  x: number;
  y: number;
  ports: DemoPort[];
};

type DemoObstacleCard = {
  title: string;
  description: string;
  x: number;
  y: number;
  width: number;
};

type DemoPath = {
  id: string;
  positions: string[];
};

type StrokePreset = {
  name: string;
  description: string;
  color: string;
  width: number;
  dash: string;
};

@Component({
  selector: 'app-root',
  imports: [
    FlowPathHost,
    FlowPathNode,
    FlowPath,
    Obstacle,
    CdkDrag,
    MatSlider,
    FormsModule,
    MatSliderThumb,
    MatLabel,
    MatFormField,
    MatInput,
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  readonly lineWidth = signal(5);
  readonly color = signal('#2563eb');
  readonly dash = signal('10,10');

  readonly capabilities = [
    {
      title: 'Obstacle-aware routing',
      description: 'Lines bend around blockers so layouts stay readable as cards move.',
    },
    {
      title: 'Two host modes',
      description: 'Use a global overlay for convenience or a bounded host for dense workspaces.',
    },
    {
      title: 'Live styling',
      description: 'Tune stroke width, color, and dash patterns without rebuilding the scene.',
    },
  ] as const;

  readonly implicitCards: DemoNodeCard[] = [
    {
      eyebrow: 'Intake',
      title: 'Capture request',
      description: 'Start with a draggable source card and let FlowPath anchor the route.',
      x: 32,
      y: 56,
      ports: [{ id: 'global-intake', side: 'right' }],
    },
    {
      eyebrow: 'Scoring',
      title: 'Prioritize work',
      description: 'Keep the main workflow legible even as blockers shift around the canvas.',
      x: 348,
      y: 34,
      ports: [
        { id: 'global-priority-in', side: 'left' },
        { id: 'global-priority-out', side: 'right' },
      ],
    },
    {
      eyebrow: 'Review',
      title: 'Route to approval',
      description: 'The path updates live while nodes and obstacles are dragged.',
      x: 324,
      y: 252,
      ports: [
        { id: 'global-review-in', side: 'left' },
        { id: 'global-review-out', side: 'right' },
      ],
    },
    {
      eyebrow: 'Delivery',
      title: 'Ship the outcome',
      description: 'Implicit mode works across the page with almost no setup.',
      x: 660,
      y: 154,
      ports: [{ id: 'global-delivery', side: 'left' }],
    },
  ];

  readonly implicitObstacles: DemoObstacleCard[] = [
    {
      title: 'Compliance gate',
      description: 'Moves like any other blocker.',
      x: 192,
      y: 170,
      width: 150,
    },
    {
      title: 'Legacy sync',
      description: 'Forces a wider reroute.',
      x: 530,
      y: 72,
      width: 136,
    },
    {
      title: 'Manual approval',
      description: 'Add drag to see the route settle again.',
      x: 510,
      y: 282,
      width: 154,
    },
  ];

  readonly implicitPaths: DemoPath[] = [
    { id: 'global-path-1', positions: ['global-intake', 'global-priority-in'] },
    { id: 'global-path-2', positions: ['global-priority-out', 'global-review-in'] },
    { id: 'global-path-3', positions: ['global-review-out', 'global-delivery'] },
  ];

  readonly explicitCards: DemoNodeCard[] = [
    {
      eyebrow: 'Planner',
      title: 'Design the route',
      description: 'Bound the canvas to a single product area.',
      x: 28,
      y: 56,
      ports: [{ id: 'explicit-plan', side: 'right' }],
    },
    {
      eyebrow: 'Execution',
      title: 'Coordinate services',
      description: 'Perfect for dashboards, editors, and flow-heavy modules.',
      x: 290,
      y: 218,
      ports: [
        { id: 'explicit-execution-in', side: 'left' },
        { id: 'explicit-execution-out', side: 'right' },
      ],
    },
    {
      eyebrow: 'Insights',
      title: 'Publish the result',
      description: 'Style the active paths from the control panel.',
      x: 612,
      y: 82,
      ports: [{ id: 'explicit-insights', side: 'left' }],
    },
  ];

  readonly explicitObstacles: DemoObstacleCard[] = [
    {
      title: 'Audit trail',
      description: 'A bounded host keeps redraw work local.',
      x: 222,
      y: 78,
      width: 158,
    },
    {
      title: 'Policy check',
      description: 'Move blockers to create tighter detours.',
      x: 490,
      y: 232,
      width: 146,
    },
  ];

  readonly explicitPaths: DemoPath[] = [
    { id: 'explicit-path-1', positions: ['explicit-plan', 'explicit-execution-in'] },
    { id: 'explicit-path-2', positions: ['explicit-execution-out', 'explicit-insights'] },
  ];

  readonly strokePresets: StrokePreset[] = [
    {
      name: 'Product blue',
      description: 'Calm default for app demos',
      color: '#2563eb',
      width: 5,
      dash: '10,10',
    },
    {
      name: 'Ops green',
      description: 'Solid signal for success paths',
      color: '#0f9d58',
      width: 6,
      dash: '',
    },
    {
      name: 'Alert magenta',
      description: 'Sharper emphasis for active routes',
      color: '#d946ef',
      width: 4,
      dash: '18,8,4,8',
    },
  ];

  readonly lineWidthLabel = computed(() => `${this.lineWidth().toFixed(1)} px`);
  readonly dashPreview = computed(() => this.dashArray()?.join(' / ') ?? 'solid');
  readonly strokeSummary = computed(
    () => `${this.lineWidthLabel()} - ${this.color()} - ${this.dashPreview()}`,
  );

  readonly dashArray = computed<number[] | null>(() => {
    const values = this.dash()
      .split(',')
      .map((segment) => Number.parseFloat(segment.trim()))
      .filter((segment) => Number.isFinite(segment) && segment > 0);

    return values.length > 0 ? values : null;
  });

  applyPreset(preset: StrokePreset): void {
    this.color.set(preset.color);
    this.lineWidth.set(preset.width);
    this.dash.set(preset.dash);
  }
}

import {Component, Input} from '@angular/core';
import {NgFor, NgIf} from '@angular/common';

export interface PieSlice {
  label: string;
  value: number;
  color: string;
}

export interface PieArc {
  slice: PieSlice;
  path: string | null;
}

const RADIUS = 50;
const CENTER = 50;

function pointAt(fraction: number): string {
  const angle = fraction * 2 * Math.PI - Math.PI / 2;
  return `${CENTER + RADIUS * Math.cos(angle)} ${CENTER + RADIUS * Math.sin(angle)}`;
}

@Component({
  selector: 'app-pie-chart',
  standalone: true,
  imports: [
    NgFor,
    NgIf
  ],
  templateUrl: './pie-chart.component.html',
  styleUrl: './pie-chart.component.css'
})
export class PieChartComponent {
  protected readonly RADIUS = RADIUS;
  protected readonly CENTER = CENTER;

  @Input({required: true}) slices: PieSlice[] = [];
  @Input() emptyText = '';

  get visibleSlices(): PieSlice[] {
    return this.slices.filter((slice) => slice.value > 0);
  }

  get arcs(): PieArc[] {
    const visible = this.visibleSlices;
    const total = visible.reduce((sum, slice) => sum + slice.value, 0);
    if (visible.length === 1) {
      return [{slice: visible[0], path: null}];
    }

    let start = 0;
    return visible.map((slice) => {
      const end = start + slice.value / total;
      const largeArc = end - start > 0.5 ? 1 : 0;
      const path = `M ${CENTER} ${CENTER} L ${pointAt(start)} A ${RADIUS} ${RADIUS} 0 ${largeArc} 1 ${pointAt(end)} Z`;
      start = end;
      return {slice, path};
    });
  }
}

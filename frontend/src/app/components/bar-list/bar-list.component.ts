import {Component, Input, ChangeDetectionStrategy} from '@angular/core';
import {NgFor, NgIf} from '@angular/common';

export interface BarListRow {
  label: string;
  value: number;
}

@Component({
  selector: 'app-bar-list',
  imports: [
    NgFor,
    NgIf
  ],
  templateUrl: './bar-list.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './bar-list.component.css'
})
export class BarListComponent {
  @Input() rows: BarListRow[] = [];
  @Input() emptyText = '';

  get hasData(): boolean {
    return this.rows.some((row) => row.value > 0);
  }

  get max(): number {
    return Math.max(1, ...this.rows.map((row) => row.value));
  }

  width(row: BarListRow): number {
    return row.value / this.max * 100;
  }
}

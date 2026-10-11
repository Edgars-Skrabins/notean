import {ComponentFixture, TestBed} from '@angular/core/testing';
import {PieChartComponent, PieSlice} from './pie-chart.component';

describe('PieChartComponent', () => {
  let fixture: ComponentFixture<PieChartComponent>;
  let component: PieChartComponent;

  function render(slices: PieSlice[]) {
    fixture.componentRef.setInput('slices', slices);
    fixture.componentRef.setInput('emptyText', 'No tickets yet.');
    fixture.detectChanges();
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({imports: [PieChartComponent]}).compileComponents();
    fixture = TestBed.createComponent(PieChartComponent);
    component = fixture.componentInstance;
  });

  it('draws one arc per non-empty slice with sizes proportional to the values', () => {
    render([
      {label: 'To Do', value: 3, color: '#111'},
      {label: 'Doing', value: 1, color: '#222'},
    ]);

    const paths = fixture.nativeElement.querySelectorAll('path');
    expect(paths.length).toBe(2);
    expect(component.arcs[0].path).toContain('A 50 50 0 1 1');
    expect(component.arcs[1].path).toContain('A 50 50 0 0 1');
  });

  it('draws a full circle for a single slice', () => {
    render([{label: 'To Do', value: 4, color: '#111'}, {label: 'Done', value: 0, color: '#222'}]);

    expect(fixture.nativeElement.querySelectorAll('circle').length).toBe(1);
    expect(fixture.nativeElement.querySelectorAll('path').length).toBe(0);
  });

  it('leaves zero values out of the chart and the legend', () => {
    render([{label: 'To Do', value: 2, color: '#111'}, {label: 'Done', value: 0, color: '#222'}, {label: 'Doing', value: 1, color: '#333'}]);

    const labels = Array.from(fixture.nativeElement.querySelectorAll('.pieChart__label')).map((element) => (element as HTMLElement).textContent);
    expect(labels).toEqual(['To Do', 'Doing']);
  });

  it('shows the empty text when every value is zero', () => {
    render([{label: 'To Do', value: 0, color: '#111'}]);

    expect(fixture.nativeElement.querySelector('svg')).toBeNull();
    expect(fixture.nativeElement.querySelector('.pieChart__empty').textContent.trim()).toBe('No tickets yet.');
  });
});

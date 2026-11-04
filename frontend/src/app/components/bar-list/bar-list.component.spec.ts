import {ComponentFixture, TestBed} from '@angular/core/testing';
import {BarListComponent, BarListRow} from './bar-list.component';

describe('BarListComponent', () => {
  let fixture: ComponentFixture<BarListComponent>;

  function render(rows: BarListRow[]) {
    fixture.componentRef.setInput('rows', rows);
    fixture.componentRef.setInput('emptyText', 'No tickets yet.');
    fixture.detectChanges();
  }

  function texts(selector: string): string[] {
    return Array.from(fixture.nativeElement.querySelectorAll(selector)).map((element) => (element as HTMLElement).textContent!.trim());
  }

  function widths(): string[] {
    return Array.from(fixture.nativeElement.querySelectorAll('.barList__fill')).map((element) => (element as HTMLElement).style.width);
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({imports: [BarListComponent]}).compileComponents();
    fixture = TestBed.createComponent(BarListComponent);
  });

  it('shows one row per input row with its label and value', () => {
    render([{label: 'Backlog', value: 2}, {label: 'To Do', value: 4}, {label: 'Done', value: 0}]);

    expect(texts('.barList__label')).toEqual(['Backlog', 'To Do', 'Done']);
    expect(texts('.barList__value')).toEqual(['2', '4', '0']);
  });

  it('sizes the bars relative to the largest value', () => {
    render([{label: 'Backlog', value: 2}, {label: 'To Do', value: 4}, {label: 'Done', value: 0}]);

    expect(widths()).toEqual(['50%', '100%', '0%']);
  });

  it('shows the empty text when every value is zero', () => {
    render([{label: 'Backlog', value: 0}]);

    expect(fixture.nativeElement.querySelector('.barList')).toBeNull();
    expect(texts('.barList__empty')).toEqual(['No tickets yet.']);
  });

  it('shows the empty text when there are no rows', () => {
    render([]);

    expect(fixture.nativeElement.querySelector('.barList')).toBeNull();
    expect(texts('.barList__empty')).toEqual(['No tickets yet.']);
  });
});

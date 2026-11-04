import {TestBed} from '@angular/core/testing';
import {IconButtonComponent} from './icon-button.component';

describe('IconButtonComponent', () => {
  async function render(expanded?: boolean) {
    await TestBed.configureTestingModule({
      imports: [IconButtonComponent],
    }).compileComponents();
    const fixture = TestBed.createComponent(IconButtonComponent);
    fixture.componentRef.setInput('icon', 'menu');
    fixture.componentRef.setInput('tooltip', 'Menu');
    if (expanded !== undefined) {
      fixture.componentRef.setInput('expanded', expanded);
    }
    fixture.detectChanges();
    return fixture.nativeElement.querySelector('button') as HTMLButtonElement;
  }

  it('leaves aria-expanded off by default', async () => {
    const button = await render();

    expect(button.hasAttribute('aria-expanded')).toBeFalse();
  });

  it('reflects expanded as true', async () => {
    const button = await render(true);

    expect(button.getAttribute('aria-expanded')).toBe('true');
  });

  it('reflects expanded as false', async () => {
    const button = await render(false);

    expect(button.getAttribute('aria-expanded')).toBe('false');
  });
});

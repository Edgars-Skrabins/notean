import {EscapeService} from './escape.service';

describe('EscapeService', () => {
  let service: EscapeService;

  function pressEscape(prevented = false): KeyboardEvent {
    const event = new KeyboardEvent('keydown', {key: 'Escape', cancelable: true});
    if (prevented) {
      event.preventDefault();
    }
    document.dispatchEvent(event);
    return event;
  }

  beforeEach(() => {
    service = new EscapeService(document);
  });

  afterEach(() => {
    service.ngOnDestroy();
  });

  it('runs the top handler and marks the event as handled', () => {
    const bottom = jasmine.createSpy('bottom');
    const top = jasmine.createSpy('top');
    service.push(bottom);
    service.push(top);

    const event = pressEscape();

    expect(top).toHaveBeenCalledTimes(1);
    expect(bottom).not.toHaveBeenCalled();
    expect(event.defaultPrevented).toBeTrue();
  });

  it('does not run an unregistered handler', () => {
    const bottom = jasmine.createSpy('bottom');
    const top = jasmine.createSpy('top');
    service.push(bottom);
    const unregister = service.push(top);

    unregister();
    pressEscape();

    expect(top).not.toHaveBeenCalled();
    expect(bottom).toHaveBeenCalledTimes(1);
  });

  it('runs nothing when an inner control already consumed the event', () => {
    const handler = jasmine.createSpy('handler');
    service.push(handler);

    pressEscape(true);

    expect(handler).not.toHaveBeenCalled();
  });

  it('runs only one handler per key press', () => {
    const bottom = jasmine.createSpy('bottom');
    const unregister = service.push(bottom);
    const top = jasmine.createSpy('top').and.callFake(() => unregister());
    service.push(top);

    pressEscape();

    expect(top).toHaveBeenCalledTimes(1);
    expect(bottom).not.toHaveBeenCalled();
  });

  it('ignores other keys', () => {
    const handler = jasmine.createSpy('handler');
    service.push(handler);

    document.dispatchEvent(new KeyboardEvent('keydown', {key: 'Enter'}));

    expect(handler).not.toHaveBeenCalled();
  });
});

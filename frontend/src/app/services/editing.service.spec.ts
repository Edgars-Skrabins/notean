import {Subscription} from '@rails/actioncable';
import {CableService} from "@services/cable.service";
import {PageEditingService} from "@services/page-editing.service";

describe('EditingService', () => {
  let subscription: jasmine.SpyObj<Subscription>;
  let cableService: jasmine.SpyObj<CableService>;
  let service: PageEditingService;

  beforeEach(() => {
    subscription = jasmine.createSpyObj<Subscription>('Subscription', ['unsubscribe', 'perform']);
    cableService = jasmine.createSpyObj<CableService>('CableService', ['subscribe', 'disconnect']);
    cableService.subscribe.and.returnValue(subscription);
    service = new PageEditingService(cableService);
  });

  it('subscribes through the shared cable and passes on the editor', () => {
    const onEditingChange = jasmine.createSpy('onEditingChange');

    service.connect(7, onEditingChange);
    const callbacks = cableService.subscribe.calls.mostRecent().args[1];
    callbacks.received!({editing: null});

    expect(cableService.subscribe).toHaveBeenCalledOnceWith({channel: 'PageEditingChannel', page_id: 7}, jasmine.any(Object));
    expect(onEditingChange).toHaveBeenCalledOnceWith(null);
  });

  it('disconnect only unsubscribes and leaves the shared connection open', () => {
    service.connect(7, () => undefined);
    service.disconnect();
    service.startEditing();

    expect(subscription.unsubscribe).toHaveBeenCalled();
    expect(subscription.perform).not.toHaveBeenCalled();
    expect(cableService.disconnect).not.toHaveBeenCalled();
  });
});

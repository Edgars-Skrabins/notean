import {Consumer, Subscription} from '@rails/actioncable';
import {CableService} from "./cable.service";
import {AuthService} from "@services/auth.service";
import {baseUrl} from "@config/axiosConfig";

describe('CableService', () => {
  let authService: jasmine.SpyObj<AuthService>;
  let consumers: jasmine.SpyObj<Consumer>[];
  let service: CableService;

  function fakeConsumer(): jasmine.SpyObj<Consumer> {
    const consumer = jasmine.createSpyObj<Consumer>('Consumer', ['disconnect']);
    consumer.subscriptions = jasmine.createSpyObj('Subscriptions', ['create']);
    (consumer.subscriptions.create as jasmine.Spy).and.returnValue({} as Subscription);
    return consumer;
  }

  beforeEach(() => {
    authService = jasmine.createSpyObj<AuthService>('AuthService', ['getToken']);
    authService.getToken.and.returnValue('jwt');
    consumers = [];
    service = new CableService(authService);
    spyOn(service, 'createConsumer').and.callFake(() => {
      const consumer = fakeConsumer();
      consumers.push(consumer);
      return consumer;
    });
  });

  it('shares one consumer across subscriptions', () => {
    service.subscribe({channel: 'TeamChannel', team_code: 'abc'}, {});
    service.subscribe({channel: 'BoardChannel', board_id: 1}, {});

    expect(service.createConsumer).toHaveBeenCalledOnceWith(baseUrl.replace(/^http/, 'ws') + '/cable?token=jwt');
    expect(consumers[0].subscriptions.create).toHaveBeenCalledTimes(2);
  });

  it('disconnect closes the consumer and the next subscribe opens a new one with the current token', () => {
    service.subscribe({channel: 'TeamChannel', team_code: 'abc'}, {});
    service.disconnect();
    authService.getToken.and.returnValue('next');
    service.subscribe({channel: 'TeamChannel', team_code: 'abc'}, {});

    expect(consumers[0].disconnect).toHaveBeenCalled();
    expect(consumers.length).toBe(2);
    expect(service.createConsumer).toHaveBeenCalledWith(baseUrl.replace(/^http/, 'ws') + '/cable?token=next');
  });

  it('disconnect without a consumer does nothing', () => {
    expect(() => service.disconnect()).not.toThrow();
    expect(service.createConsumer).not.toHaveBeenCalled();
  });
});

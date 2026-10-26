import {Consumer, Subscription} from '@rails/actioncable';
import {CABLE_TICKET_REFRESH_MS, CableService} from "./cable.service";
import {axiosInstance, baseUrl} from "@config/axiosConfig";

describe('CableService', () => {
  let tickets: string[];
  let post: jasmine.Spy;
  let consumers: jasmine.SpyObj<Consumer>[];
  let urls: (() => string)[];
  let service: CableService;

  const cableUrl = (ticket: string) => baseUrl.replace(/^http/, 'ws') + `/cable?ticket=${ticket}`;

  function fakeConsumer(): jasmine.SpyObj<Consumer> {
    const consumer = jasmine.createSpyObj<Consumer>('Consumer', ['disconnect']);
    consumer.subscriptions = jasmine.createSpyObj('Subscriptions', ['create']);
    (consumer.subscriptions.create as jasmine.Spy).and.callFake(() =>
      jasmine.createSpyObj<Subscription>('Subscription', ['perform', 'unsubscribe']));
    return consumer;
  }

  async function flush() {
    for (let i = 0; i < 10; i++) {
      await Promise.resolve();
    }
  }

  beforeEach(() => {
    jasmine.clock().install();
    tickets = ['first', 'second', 'third'];
    post = spyOn(axiosInstance, 'post').and.callFake(() => Promise.resolve({data: {ticket: tickets.shift()}}) as any);
    consumers = [];
    urls = [];
    service = new CableService();
    spyOn(service, 'createConsumer').and.callFake((url: () => string) => {
      const consumer = fakeConsumer();
      consumers.push(consumer);
      urls.push(url);
      return consumer;
    });
  });

  afterEach(() => {
    service.disconnect();
    jasmine.clock().uninstall();
  });

  it('opens one consumer with a cable ticket in the URL and shares it across subscriptions', async () => {
    service.subscribe({channel: 'TeamChannel', team_code: 'abc'}, {});
    service.subscribe({channel: 'BoardChannel', board_id: 1}, {});
    await flush();

    expect(post).toHaveBeenCalledOnceWith('/auth/cable_ticket');
    expect(consumers.length).toBe(1);
    expect(urls[0]()).toBe(cableUrl('first'));
    expect(urls[0]()).not.toContain('token=');
    expect(consumers[0].subscriptions.create).toHaveBeenCalledTimes(2);
  });

  it('passes perform and unsubscribe through to the subscription', async () => {
    const handle = service.subscribe({channel: 'PageEditingChannel', page_id: 7}, {});
    await flush();
    const subscription = (consumers[0].subscriptions.create as jasmine.Spy).calls.mostRecent().returnValue;

    handle.perform('start_editing');
    handle.unsubscribe();

    expect(subscription.perform).toHaveBeenCalledWith('start_editing', undefined);
    expect(subscription.unsubscribe).toHaveBeenCalled();
  });

  it('refreshes the ticket every 45 seconds so reconnects use a fresh one', async () => {
    service.subscribe({channel: 'TeamChannel', team_code: 'abc'}, {});
    await flush();

    jasmine.clock().tick(CABLE_TICKET_REFRESH_MS - 1);
    await flush();
    expect(post).toHaveBeenCalledTimes(1);

    jasmine.clock().tick(1);
    await flush();
    expect(post).toHaveBeenCalledTimes(2);
    expect(urls[0]()).toBe(cableUrl('second'));
  });

  it('pauses refreshing while the tab is hidden and fetches a fresh ticket when it is visible again', async () => {
    const visibility = spyOnProperty(document, 'visibilityState').and.returnValue('visible');
    service.subscribe({channel: 'TeamChannel', team_code: 'abc'}, {});
    await flush();

    visibility.and.returnValue('hidden');
    document.dispatchEvent(new Event('visibilitychange'));
    jasmine.clock().tick(CABLE_TICKET_REFRESH_MS * 3);
    await flush();
    expect(post).toHaveBeenCalledTimes(1);

    visibility.and.returnValue('visible');
    document.dispatchEvent(new Event('visibilitychange'));
    await flush();
    expect(post).toHaveBeenCalledTimes(2);
    expect(urls[0]()).toBe(cableUrl('second'));

    jasmine.clock().tick(CABLE_TICKET_REFRESH_MS);
    await flush();
    expect(post).toHaveBeenCalledTimes(3);
  });

  it('stops listening for visibility changes on disconnect', async () => {
    const visibility = spyOnProperty(document, 'visibilityState').and.returnValue('hidden');
    service.subscribe({channel: 'TeamChannel', team_code: 'abc'}, {});
    await flush();

    service.disconnect();
    visibility.and.returnValue('visible');
    document.dispatchEvent(new Event('visibilitychange'));
    await flush();

    expect(post).toHaveBeenCalledTimes(1);
  });

  it('stops refreshing on disconnect', async () => {
    service.subscribe({channel: 'TeamChannel', team_code: 'abc'}, {});
    await flush();

    service.disconnect();
    await flush();
    jasmine.clock().tick(CABLE_TICKET_REFRESH_MS * 3);
    await flush();

    expect(consumers[0].disconnect).toHaveBeenCalled();
    expect(post).toHaveBeenCalledTimes(1);
  });

  it('unsubscribing before the ticket arrives never creates the subscription', async () => {
    const handle = service.subscribe({channel: 'TeamChannel', team_code: 'abc'}, {});
    handle.unsubscribe();
    await flush();

    expect(consumers[0].subscriptions.create).not.toHaveBeenCalled();
  });

  it('disconnecting before the ticket arrives opens no consumer', async () => {
    service.subscribe({channel: 'TeamChannel', team_code: 'abc'}, {});
    service.disconnect();
    await flush();

    expect(service.createConsumer).not.toHaveBeenCalled();
  });

  it('the next subscribe after disconnect fetches a new ticket and opens a new consumer', async () => {
    service.subscribe({channel: 'TeamChannel', team_code: 'abc'}, {});
    await flush();
    service.disconnect();
    service.subscribe({channel: 'TeamChannel', team_code: 'abc'}, {});
    await flush();

    expect(consumers.length).toBe(2);
    expect(urls[1]()).toBe(cableUrl('second'));
  });

  it('retries the ticket on the next subscribe when it could not be fetched', async () => {
    post.and.returnValues(Promise.reject(new Error('network')), Promise.resolve({data: {ticket: 'retry'}}));

    service.subscribe({channel: 'TeamChannel', team_code: 'abc'}, {});
    await flush();
    expect(service.createConsumer).not.toHaveBeenCalled();

    service.subscribe({channel: 'TeamChannel', team_code: 'abc'}, {});
    await flush();
    expect(urls[0]()).toBe(cableUrl('retry'));
  });

  it('disconnect without a consumer does nothing', () => {
    expect(() => service.disconnect()).not.toThrow();
    expect(service.createConsumer).not.toHaveBeenCalled();
  });
});

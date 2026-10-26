import {Injectable} from '@angular/core';
import {createConsumer, Consumer, Subscription} from '@rails/actioncable';
import {axiosInstance, baseUrl} from "@config/axiosConfig";
import {apiRequest} from "@utils/apiRequest";
import {Result} from "@models/result.model";

export type CableCallbacks = {
  connected?: () => void;
  disconnected?: () => void;
  received?: (data: any) => void;
};

export type CableSubscription = Pick<Subscription, 'perform' | 'unsubscribe'>;

export const CABLE_TICKET_REFRESH_MS = 45_000;

@Injectable({
  providedIn: 'root',
})
export class CableService {
  private ticketUrl = '/auth/cable_ticket';
  private consumer: Promise<Consumer | null> | null = null;
  private ticket: string | null = null;
  private refreshTimer: ReturnType<typeof setInterval> | null = null;
  private visibilityListener: (() => void) | null = null;
  private generation = 0;

  subscribe(params: Record<string, unknown>, callbacks: CableCallbacks): CableSubscription {
    let subscription: Subscription | null = null;
    let cancelled = false;

    this.getConsumer().then((consumer) => {
      if (consumer && !cancelled) {
        subscription = consumer.subscriptions.create(params, callbacks);
      }
    });

    return {
      perform: (action, data) => subscription?.perform(action, data),
      unsubscribe: () => {
        cancelled = true;
        subscription?.unsubscribe();
      },
    };
  }

  disconnect() {
    this.generation++;
    this.stopRefreshing();
    this.consumer?.then((consumer) => consumer?.disconnect());
    this.consumer = null;
    this.ticket = null;
  }

  createConsumer(url: () => string): Consumer {
    return createConsumer(url);
  }

  private getConsumer(): Promise<Consumer | null> {
    if (!this.consumer) {
      this.consumer = this.openConsumer();
    }
    return this.consumer;
  }

  private async openConsumer(): Promise<Consumer | null> {
    const generation = this.generation;
    const ticket = await this.fetchTicket();
    if (generation !== this.generation) {
      return null;
    }
    if (!ticket) {
      this.consumer = null;
      return null;
    }

    this.ticket = ticket;
    this.startRefreshing(generation);
    return this.createConsumer(() => baseUrl.replace(/^http/, 'ws') + `/cable?ticket=${this.ticket}`);
  }

  private async refreshTicket(generation: number) {
    const ticket = await this.fetchTicket();
    if (ticket && generation === this.generation) {
      this.ticket = ticket;
    }
  }

  private async fetchTicket(): Promise<string | null> {
    const result = await apiRequest<Result<{ ticket: string }>>(
      axiosInstance.post(this.ticketUrl),
      (data) => ({success: true, ticket: data.ticket}),
    );
    return result.success ? result.ticket : null;
  }

  private startRefreshing(generation: number) {
    this.visibilityListener = () => {
      if (document.visibilityState === 'hidden') {
        this.stopTimer();
      } else if (!this.refreshTimer) {
        this.refreshTicket(generation);
        this.startTimer(generation);
      }
    };
    document.addEventListener('visibilitychange', this.visibilityListener);

    if (document.visibilityState !== 'hidden') {
      this.startTimer(generation);
    }
  }

  private startTimer(generation: number) {
    this.refreshTimer = setInterval(() => this.refreshTicket(generation), CABLE_TICKET_REFRESH_MS);
  }

  private stopRefreshing() {
    this.stopTimer();
    if (this.visibilityListener) {
      document.removeEventListener('visibilitychange', this.visibilityListener);
      this.visibilityListener = null;
    }
  }

  private stopTimer() {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }
  }
}

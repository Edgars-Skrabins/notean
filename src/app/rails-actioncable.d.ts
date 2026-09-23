declare module '@rails/actioncable' {
  export interface Subscription {
    perform(action: string, data?: Record<string, unknown>): void;

    unsubscribe(): void;
  }

  export interface Subscriptions {
    create(
      channel: string | Record<string, unknown>,
      mixin?: {
        connected?: () => void;
        disconnected?: () => void;
        received?: (data: any) => void;
        [key: string]: unknown;
      }
    ): Subscription;
  }

  export interface Consumer {
    subscriptions: Subscriptions;

    disconnect(): void;
  }

  export function createConsumer(url?: string): Consumer;
}

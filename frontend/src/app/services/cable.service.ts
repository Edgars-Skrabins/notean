import {Injectable} from '@angular/core';
import {createConsumer, Consumer, Subscription} from '@rails/actioncable';
import {baseUrl} from "@config/axiosConfig";
import {AuthService} from "@services/auth.service";

export type CableCallbacks = {
  connected?: () => void;
  disconnected?: () => void;
  received?: (data: any) => void;
};

@Injectable({
  providedIn: 'root',
})
export class CableService {
  private consumer: Consumer | null = null;

  constructor(private authService: AuthService) {
  }

  subscribe(params: Record<string, unknown>, callbacks: CableCallbacks): Subscription {
    return this.getConsumer().subscriptions.create(params, callbacks);
  }

  disconnect() {
    this.consumer?.disconnect();
    this.consumer = null;
  }

  createConsumer(url: string): Consumer {
    return createConsumer(url);
  }

  private getConsumer(): Consumer {
    if (!this.consumer) {
      const token = this.authService.getToken();
      this.consumer = this.createConsumer(baseUrl.replace(/^http/, 'ws') + `/cable?token=${token}`);
    }
    return this.consumer;
  }
}

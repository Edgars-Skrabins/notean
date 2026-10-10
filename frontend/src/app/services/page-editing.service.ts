import {Injectable} from '@angular/core';
import {createConsumer, Consumer, Subscription} from '@rails/actioncable';
import {baseUrl} from "@config/axiosConfig";
import {AuthService} from "@services/auth.service";
import {PageUser} from "@models/page.model";

@Injectable({
  providedIn: 'root',
})
export class PageEditingService {
  private consumer: Consumer | null = null;
  private subscription: Subscription | null = null;

  constructor(private authService: AuthService) {
  }

  connect(pageId: number, onEditingChange: (editor: PageUser | null) => void) {
    this.disconnect();

    const token = this.authService.getToken();
    const cableUrl = baseUrl.replace(/^http/, 'ws') + `/cable?token=${token}`;

    this.consumer = createConsumer(cableUrl);
    this.subscription = this.consumer.subscriptions.create(
      {channel: 'PageEditingChannel', page_id: pageId},
      {
        received: (data: { editing: PageUser | null }) => {
          onEditingChange(data.editing ?? null);
        },
      }
    );
  }

  startEditing() {
    this.subscription?.perform('start_editing');
  }

  stopEditing() {
    this.subscription?.perform('stop_editing');
  }

  disconnect() {
    this.subscription?.unsubscribe();
    this.consumer?.disconnect();
    this.subscription = null;
    this.consumer = null;
  }
}

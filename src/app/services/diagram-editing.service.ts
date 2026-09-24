import {Injectable} from '@angular/core';
import {createConsumer, Consumer, Subscription} from '@rails/actioncable';
import {baseUrl} from "@config/axiosConfig";
import {AuthService} from "@services/auth.service";
import {DiagramUser} from "@models/diagram.model";

@Injectable({
  providedIn: 'root',
})
export class DiagramEditingService {
  private consumer: Consumer | null = null;
  private subscription: Subscription | null = null;

  constructor(private authService: AuthService) {
  }

  connect(diagramId: number, onEditingChange: (editor: DiagramUser | null) => void) {
    this.disconnect();

    const token = this.authService.getToken();
    const cableUrl = baseUrl.replace(/^http/, 'ws') + `/cable?token=${token}`;

    this.consumer = createConsumer(cableUrl);
    this.subscription = this.consumer.subscriptions.create(
      {channel: 'DiagramEditingChannel', diagram_id: diagramId},
      {
        received: (data: { editing: DiagramUser | null }) => {
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

import {createConsumer, Consumer, Subscription} from '@rails/actioncable';
import {baseUrl} from "@config/axiosConfig";
import {AuthService} from "@services/auth.service";
import {FolderedItemEditingUser} from "@models/foldered-item.model";

export abstract class EditingService {
  protected abstract readonly channel: string;
  protected abstract readonly idParam: string;

  private consumer: Consumer | null = null;
  private subscription: Subscription | null = null;

  protected constructor(private authService: AuthService) {
  }

  connect(itemId: number, onEditingChange: (editor: FolderedItemEditingUser | null) => void) {
    this.disconnect();

    const token = this.authService.getToken();
    const cableUrl = baseUrl.replace(/^http/, 'ws') + `/cable?token=${token}`;

    this.consumer = createConsumer(cableUrl);
    this.subscription = this.consumer.subscriptions.create(
      {channel: this.channel, [this.idParam]: itemId},
      {
        received: (data: { editing: FolderedItemEditingUser | null }) => {
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

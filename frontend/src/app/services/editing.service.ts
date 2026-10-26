import {CableService, CableSubscription} from "@services/cable.service";
import {FolderedItemEditingUser} from "@models/foldered-item.model";

export abstract class EditingService {
  protected abstract readonly channel: string;
  protected abstract readonly idParam: string;

  private subscription: CableSubscription | null = null;

  protected constructor(private cableService: CableService) {
  }

  connect(itemId: number, onEditingChange: (editor: FolderedItemEditingUser | null) => void) {
    this.disconnect();

    this.subscription = this.cableService.subscribe(
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
    this.subscription = null;
  }
}

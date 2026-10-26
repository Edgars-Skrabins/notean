import {Injectable} from '@angular/core';
import {CableService} from "@services/cable.service";
import {EditingService} from "@services/editing.service";

@Injectable({
  providedIn: 'root',
})
export class DiagramEditingService extends EditingService {
  protected readonly channel = 'DiagramEditingChannel';
  protected readonly idParam = 'diagram_id';

  constructor(cableService: CableService) {
    super(cableService);
  }
}

import {Injectable} from '@angular/core';
import {CableService} from "@services/cable.service";
import {EditingService} from "@services/editing.service";

@Injectable({
  providedIn: 'root',
})
export class PageEditingService extends EditingService {
  protected readonly channel = 'PageEditingChannel';
  protected readonly idParam = 'page_id';

  constructor(cableService: CableService) {
    super(cableService);
  }
}

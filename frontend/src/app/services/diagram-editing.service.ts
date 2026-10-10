import {Injectable} from '@angular/core';
import {AuthService} from "@services/auth.service";
import {EditingService} from "@services/editing.service";

@Injectable({
  providedIn: 'root',
})
export class DiagramEditingService extends EditingService {
  protected readonly channel = 'DiagramEditingChannel';
  protected readonly idParam = 'diagram_id';

  constructor(authService: AuthService) {
    super(authService);
  }
}

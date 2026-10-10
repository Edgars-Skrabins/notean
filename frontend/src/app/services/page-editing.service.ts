import {Injectable} from '@angular/core';
import {AuthService} from "@services/auth.service";
import {EditingService} from "@services/editing.service";

@Injectable({
  providedIn: 'root',
})
export class PageEditingService extends EditingService {
  protected readonly channel = 'PageEditingChannel';
  protected readonly idParam = 'page_id';

  constructor(authService: AuthService) {
    super(authService);
  }
}

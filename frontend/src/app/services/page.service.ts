import {Injectable} from '@angular/core';
import {PagesErrorCode} from "@config/errorCodes";
import {FolderedItemService} from "@services/foldered-item.service";

@Injectable({
  providedIn: 'root',
})
export class PageService extends FolderedItemService<PagesErrorCode> {
  protected readonly resource = 'pages';
  protected readonly key = 'page';
}

import {Injectable} from '@angular/core';
import {DiagramsErrorCode} from "@config/errorCodes";
import {FolderedItemService} from "@services/foldered-item.service";

@Injectable({
  providedIn: 'root',
})
export class DiagramService extends FolderedItemService<DiagramsErrorCode> {
  protected readonly resource = 'diagrams';
  protected readonly key = 'diagram';
}

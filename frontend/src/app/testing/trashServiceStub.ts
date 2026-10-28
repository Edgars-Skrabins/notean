import {Subject} from 'rxjs';
import {TrashService} from "@services/trash.service";
import {RestoredItem} from "@models/trash.model";

export interface TrashServiceStub {
  service: jasmine.SpyObj<TrashService>;
  restored: Subject<RestoredItem[]>;
}

export function trashServiceStub(): TrashServiceStub {
  const restored = new Subject<RestoredItem[]>();
  const service = jasmine.createSpyObj<TrashService>('TrashService', ['notifyTrashed', 'list', 'restore', 'deleteForever', 'empty'], {restored$: restored.asObservable()});
  return {service, restored};
}

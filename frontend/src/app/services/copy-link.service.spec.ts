import {DefaultUrlSerializer, Router, UrlTree} from '@angular/router';
import {CopyLinkService} from './copy-link.service';
import {TeamService} from '@services/team.service';
import {ToastService} from '@services/toast.service';
import {ToastType} from '@models/toast.model';
import {PHRASES} from '@config/phrases';

describe('CopyLinkService', () => {
  const serializer = new DefaultUrlSerializer();
  let router: { url: string; parseUrl: (url: string) => UrlTree; serializeUrl: (tree: UrlTree) => string };
  let toastService: jasmine.SpyObj<ToastService>;
  let service: CopyLinkService;

  beforeEach(() => {
    router = {
      url: '/dashboard/pages/42',
      parseUrl: (url) => serializer.parse(url),
      serializeUrl: (tree) => serializer.serialize(tree),
    };
    toastService = jasmine.createSpyObj<ToastService>('ToastService', ['show']);
    const teamService = {getCurrentTeamCode: () => 'AB12CD'} as TeamService;
    service = new CopyLinkService(router as unknown as Router, teamService, toastService);
  });

  it('links the current screen with the active team', () => {
    expect(service.currentLink()).toBe(`${window.location.origin}/dashboard/pages/42?team=AB12CD`);
  });

  it('keeps the board tab and ticket path but drops other query params and the fragment', () => {
    router.url = '/dashboard/boards/5/list/tickets/7?folder=3&team=OLD#top';

    expect(service.currentLink()).toBe(`${window.location.origin}/dashboard/boards/5/list/tickets/7?team=AB12CD`);
  });

  it('shows a success toast once copied', async () => {
    const writeText = spyOn(navigator.clipboard, 'writeText').and.resolveTo();

    await service.copyCurrentLink();

    expect(writeText).toHaveBeenCalledOnceWith(`${window.location.origin}/dashboard/pages/42?team=AB12CD`);
    expect(toastService.show).toHaveBeenCalledOnceWith({type: ToastType.SUCCESS, message: PHRASES.LINK_COPIED});
  });

  it('shows an error toast when the clipboard refuses', async () => {
    spyOn(navigator.clipboard, 'writeText').and.rejectWith(new Error('denied'));

    await service.copyCurrentLink();

    expect(toastService.show).toHaveBeenCalledOnceWith({type: ToastType.ERROR, message: PHRASES.LINK_COPY_FAILED});
  });
});

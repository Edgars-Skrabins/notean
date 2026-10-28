import {ComponentFixture, TestBed} from '@angular/core/testing';
import {provideTranslateService} from '@ngx-translate/core';
import {AttachmentListComponent} from './attachment-list.component';
import {Attachment} from '@models/attachment.model';
import {AttachmentService} from '@services/attachment.service';
import {AuthService} from '@services/auth.service';
import {TeamService} from '@services/team.service';
import {TeamRole} from '@models/team.model';
import {PHRASES} from '@config/phrases';

function buildAttachment(overrides: Partial<Attachment>): Attachment {
  return {
    id: 1,
    filename: 'notes.txt',
    contentType: 'text/plain',
    byteSize: 2048,
    kind: 'file',
    uploader: {id: 2, nickname: 'Alice', avatar: {color: 'blue', imageUrl: null}},
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

describe('AttachmentListComponent', () => {
  let fixture: ComponentFixture<AttachmentListComponent>;
  let attachmentService: jasmine.SpyObj<AttachmentService>;
  let role: TeamRole;

  beforeEach(async () => {
    role = 'user';
    attachmentService = jasmine.createSpyObj<AttachmentService>('AttachmentService', ['objectUrl', 'download']);
    attachmentService.download.and.returnValue(Promise.resolve({success: true}));

    await TestBed.configureTestingModule({
      imports: [AttachmentListComponent],
      providers: [
        provideTranslateService(),
        {provide: AttachmentService, useValue: attachmentService},
        {provide: AuthService, useValue: {getCurrentUser: () => ({id: 2, email: 'alice@example.com'})}},
        {provide: TeamService, useValue: {getCurrentRole: () => role}},
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AttachmentListComponent);
    fixture.componentInstance.teamCode = 'ABC';
  });

  function text(): string {
    return (fixture.nativeElement as HTMLElement).textContent ?? '';
  }

  it('shows the empty state only without attachments and uploads', () => {
    fixture.detectChanges();
    expect(text()).toContain(PHRASES.NO_ATTACHMENTS);

    fixture.componentInstance.uploads = [{key: 1, filename: 'big.zip', progress: 40}];
    fixture.detectChanges();
    expect(text()).not.toContain(PHRASES.NO_ATTACHMENTS);
    expect(text()).toContain('big.zip');
  });

  it('lets the uploader, admins and the owner delete but not other members', () => {
    const own = buildAttachment({id: 1});
    const other = buildAttachment({id: 2, uploader: {id: 9, nickname: 'Bob', avatar: {color: 'red', imageUrl: null}}});
    const component = fixture.componentInstance;

    expect([component.canDelete(own), component.canDelete(other)]).toEqual([true, false]);
    role = 'admin';
    expect(component.canDelete(other)).toBeTrue();
    role = 'owner';
    expect(component.canDelete(other)).toBeTrue();
  });

  it('previews images and downloads other files', () => {
    const image = buildAttachment({id: 3, contentType: 'image/png', filename: 'a.png'});
    const file = buildAttachment({id: 4});
    const component = fixture.componentInstance;

    component.handleOpen(image);
    component.handleOpen(file);

    expect(component.previewed).toBe(image);
    expect(attachmentService.download).toHaveBeenCalledOnceWith('ABC', file);
  });

  it('emits picked files and clears the input', () => {
    const emitted = jasmine.createSpy('filesSelected');
    fixture.componentInstance.filesSelected.subscribe(emitted);
    const file = new File(['x'], 'a.txt');
    const transfer = new DataTransfer();
    transfer.items.add(file);
    const input = document.createElement('input');
    input.type = 'file';
    input.files = transfer.files;

    fixture.componentInstance.handlePicked(input);

    expect(emitted).toHaveBeenCalledWith([file]);
    expect(input.value).toBe('');
  });
});

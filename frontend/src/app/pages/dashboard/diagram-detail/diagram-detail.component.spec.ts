import {NO_ERRORS_SCHEMA} from '@angular/core';
import {NgIf} from '@angular/common';
import {DeferBlockState, TestBed} from '@angular/core/testing';
import {By} from '@angular/platform-browser';
import {ActivatedRoute} from '@angular/router';
import {NEVER} from 'rxjs';
import {provideTranslateService, TranslatePipe} from '@ngx-translate/core';
import {DiagramService} from '@services/diagram.service';
import {DiagramEditingService} from '@services/diagram-editing.service';
import {TeamService} from '@services/team.service';
import {AuthService} from '@services/auth.service';
import {NavigationService} from '@services/navigation.service';
import {FavoriteService} from '@services/favorite.service';
import {ToastService} from '@services/toast.service';
import {ProjectFilterService} from '@services/project-filter.service';
import {FolderService} from '@services/folder.service';
import {CopyLinkService} from '@services/copy-link.service';
import {TrashService} from '@services/trash.service';
import {TemplateService} from '@services/template.service';
import {FolderedItemDetail} from '@models/foldered-item.model';
import {projectFilterStub} from '../../../testing/projectFilterStub';
import {trashServiceStub} from '../../../testing/trashServiceStub';
import {DiagramDetailComponent} from './diagram-detail.component';

function emptyDiagram(): FolderedItemDetail {
  return {
    id: 9,
    title: 'Flow',
    folderId: null,
    projectId: null,
    lockVersion: 0,
    creator: {id: 1, nickname: 'alice', avatar: {color: 'blue', imageUrl: null}},
    createdAt: '',
    updatedAt: '',
    content: '',
    contributors: [],
    currentlyEditing: null,
    attachments: [],
  };
}

describe('DiagramDetailComponent', () => {
  it('switches to edit mode from the empty diagram\'s Edit diagram button', async () => {
    const editingService = jasmine.createSpyObj<DiagramEditingService>('DiagramEditingService', ['connect', 'disconnect', 'startEditing', 'stopEditing']);
    TestBed.configureTestingModule({
      imports: [DiagramDetailComponent],
      providers: [
        provideTranslateService(),
        {provide: ActivatedRoute, useValue: {paramMap: NEVER}},
        {provide: DiagramService, useValue: {}},
        {provide: DiagramEditingService, useValue: editingService},
        {provide: TeamService, useValue: {getCurrentTeamCode: () => 'abc'}},
        {provide: AuthService, useValue: {getCurrentUser: () => null}},
        {provide: NavigationService, useValue: {}},
        {provide: FavoriteService, useValue: {}},
        {provide: ToastService, useValue: {}},
        {provide: ProjectFilterService, useValue: projectFilterStub().service},
        {provide: FolderService, useValue: {}},
        {provide: CopyLinkService, useValue: {}},
        {provide: TrashService, useValue: trashServiceStub().service},
        {provide: TemplateService, useValue: {}},
      ],
    }).overrideComponent(DiagramDetailComponent, {set: {imports: [NgIf, TranslatePipe], schemas: [NO_ERRORS_SCHEMA]}});
    const fixture = TestBed.createComponent(DiagramDetailComponent);
    const component = fixture.componentInstance;
    component.item = emptyDiagram();
    component.mode = 'view';
    component.isLoading = false;
    fixture.detectChanges();
    const [editorBlock] = await fixture.getDeferBlocks();
    await editorBlock.render(DeferBlockState.Complete);

    fixture.debugElement.query(By.css('app-button[flowchartEmptyAction]')).triggerEventHandler('pressed');

    expect(component.mode).toBe('edit');
    expect(editingService.startEditing).toHaveBeenCalled();
  });
});

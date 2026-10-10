import {fakeAsync, flushMicrotasks} from '@angular/core/testing';
import {ActivatedRoute, Router} from "@angular/router";
import {CardDetailComponent} from "./card-detail.component";
import {CardService} from "@services/card.service";
import {TeamService} from "@services/team.service";
import {FavoriteService} from "@services/favorite.service";
import {CardDetail} from "@models/card.model";

describe('CardDetailComponent editing', () => {
  let component: CardDetailComponent;
  let cardService: jasmine.SpyObj<CardService>;
  let favoriteService: jasmine.SpyObj<FavoriteService>;
  let card: CardDetail;

  beforeEach(() => {
    cardService = jasmine.createSpyObj('CardService', ['updateCard']);
    favoriteService = jasmine.createSpyObj<FavoriteService>('FavoriteService', ['forgetItem', 'renameItem']);
    const teamService = jasmine.createSpyObj<TeamService>('TeamService', ['getCurrentTeam']);
    teamService.getCurrentTeam.and.returnValue({id: 1, name: 'Team A', code: 'aaa'});
    component = new CardDetailComponent({} as ActivatedRoute, {} as Router, cardService, teamService, favoriteService);

    card = {
      id: 1,
      title: 'My Card',
      position: 0,
      description: 'Details',
      columnId: 2,
      creator: {id: 3, nickname: 'bob'},
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-02T00:00:00Z',
    };
    component.card = card;
    component.titleDraft = card.title;
    component.descriptionDraft = card.description;
  });

  it('commitTitle reverts the draft and skips the request when the title is blank', () => {
    component.titleDraft = '   ';

    component.commitTitle();

    expect(component.titleDraft).toBe('My Card');
    expect(cardService.updateCard).not.toHaveBeenCalled();
  });

  it('commitTitle skips the request when the title is unchanged', () => {
    component.titleDraft = ' My Card ';

    component.commitTitle();

    expect(cardService.updateCard).not.toHaveBeenCalled();
  });

  it('commitTitle sends the trimmed title and applies the returned card', fakeAsync(() => {
    cardService.updateCard.and.returnValue(Promise.resolve({success: true, card: {...card, title: 'Renamed'}}));
    component.titleDraft = '  Renamed  ';

    component.commitTitle();
    flushMicrotasks();

    expect(cardService.updateCard).toHaveBeenCalledWith('aaa', 0, 0, {title: 'Renamed'});
    expect(component.card?.title).toBe('Renamed');
    expect(component.titleDraft).toBe('Renamed');
    expect(favoriteService.renameItem).toHaveBeenCalledWith('Card', 1, 'Renamed');
  }));

  it('commitTitle shows the error and keeps the draft when the request fails', fakeAsync(() => {
    cardService.updateCard.and.returnValue(Promise.resolve({success: false, statusMessage: 'Failed'}));
    component.titleDraft = 'Renamed';

    component.commitTitle();
    flushMicrotasks();

    expect(component.alertMessage).toBe('Failed');
    expect(component.card?.title).toBe('My Card');
    expect(component.titleDraft).toBe('Renamed');
  }));

  it('cancelTitleEdit restores the saved title', () => {
    component.titleDraft = 'Renamed';

    component.cancelTitleEdit();

    expect(component.titleDraft).toBe('My Card');
  });

  it('commitDescription skips the request when the description is unchanged', () => {
    component.commitDescription();

    expect(cardService.updateCard).not.toHaveBeenCalled();
  });

  it('commitDescription sends the description and applies the returned card', fakeAsync(() => {
    cardService.updateCard.and.returnValue(Promise.resolve({success: true, card: {...card, description: 'New details'}}));
    component.descriptionDraft = 'New details';

    component.commitDescription();
    flushMicrotasks();

    expect(cardService.updateCard).toHaveBeenCalledWith('aaa', 0, 0, {description: 'New details'});
    expect(component.card?.description).toBe('New details');
    expect(component.descriptionDraft).toBe('New details');
  }));

  it('commitDescription shows the error when the request fails', fakeAsync(() => {
    cardService.updateCard.and.returnValue(Promise.resolve({success: false, statusMessage: 'Failed'}));
    component.descriptionDraft = 'New details';

    component.commitDescription();
    flushMicrotasks();

    expect(component.alertMessage).toBe('Failed');
    expect(component.card?.description).toBe('Details');
  }));

  it('cancelDescriptionEdit restores the saved description', () => {
    component.descriptionDraft = 'New details';

    component.cancelDescriptionEdit();

    expect(component.descriptionDraft).toBe('Details');
  });
});

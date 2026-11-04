import {NO_ERRORS_SCHEMA} from '@angular/core';
import {By} from '@angular/platform-browser';
import {ComponentFixture, TestBed} from '@angular/core/testing';
import {AsyncPipe, NgIf} from '@angular/common';
import {BehaviorSubject} from 'rxjs';
import {provideTranslateService, TranslatePipe} from '@ngx-translate/core';
import {HomeComponent} from './home.component';
import {SettingsService} from '@services/settings.service';
import {UserSettings} from '@models/settings.model';
import {TeamService} from '@services/team.service';
import {TeamFeatures, TeamRole} from '@models/team.model';
import {FavoriteService} from '@services/favorite.service';
import {Favorite} from '@models/favorite.model';

const DISMISSED_KEY = 'homeGetStartedDismissed:abc';

describe('HomeComponent', () => {
  let fixture: ComponentFixture<HomeComponent>;
  let settings: BehaviorSubject<UserSettings>;
  let features: BehaviorSubject<TeamFeatures>;
  let homeFavorites: BehaviorSubject<Favorite[]>;
  let role: TeamRole;

  function render(showFavoritesOnHome: boolean, showMyWorkOnHome: boolean) {
    settings.next({showFavoritesOnHome, showFavoritesInSidebar: true, showMyWorkOnHome, theme: 'purple_haze', themeMode: 'system'});
    fixture.detectChanges();
  }

  function sections(): string[] {
    return Array.from(fixture.nativeElement.querySelectorAll('app-activity-inbox, app-favorites-grid, app-my-work')).map((element) => (element as HTMLElement).tagName);
  }

  beforeEach(async () => {
    settings = new BehaviorSubject<UserSettings>({showFavoritesOnHome: true, showFavoritesInSidebar: true, showMyWorkOnHome: true, theme: 'purple_haze', themeMode: 'system'});
    features = new BehaviorSubject<TeamFeatures>({pages: true, diagrams: true, boards: true, chat: true});
    homeFavorites = new BehaviorSubject<Favorite[]>([]);
    role = 'user';
    localStorage.removeItem(DISMISSED_KEY);
    await TestBed.configureTestingModule({
      imports: [HomeComponent],
      providers: [
        provideTranslateService(),
        {provide: SettingsService, useValue: {settings$: settings}},
        {provide: TeamService, useValue: {features$: features, getCurrentRole: () => role, getCurrentTeamCode: () => 'abc'}},
        {provide: FavoriteService, useValue: {homeFavorites$: homeFavorites}},
      ],
    })
      .overrideComponent(HomeComponent, {set: {imports: [AsyncPipe, NgIf, TranslatePipe], schemas: [NO_ERRORS_SCHEMA]}})
      .compileComponents();
    fixture = TestBed.createComponent(HomeComponent);
  });

  it('shows Activity first, then Favorites and My Work when both are on', () => {
    render(true, true);

    expect(sections()).toEqual(['APP-ACTIVITY-INBOX', 'APP-FAVORITES-GRID', 'APP-MY-WORK']);
  });

  it('always shows Activity, even with Favorites and My Work off', () => {
    render(false, false);

    expect(sections()).toEqual(['APP-ACTIVITY-INBOX']);
  });

  it('hides My Work when boards are turned off', () => {
    features.next({pages: true, diagrams: true, boards: false, chat: true});
    render(true, true);

    expect(sections()).toEqual(['APP-ACTIVITY-INBOX', 'APP-FAVORITES-GRID']);
  });

  describe('get started', () => {
    afterEach(() => localStorage.removeItem(DISMISSED_KEY));

    function activityLoaded(empty: boolean) {
      fixture.debugElement.query(By.css('app-activity-inbox')).triggerEventHandler('emptyChange', empty);
      fixture.detectChanges();
    }

    function getStarted() {
      return fixture.debugElement.query(By.css('app-home-get-started'));
    }

    it('stays hidden while Activity is loading', () => {
      render(true, true);

      expect(getStarted()).toBeNull();
    });

    it('shows above Activity when Activity is empty and there are no favorites', () => {
      render(true, true);
      activityLoaded(true);

      expect(sections()).toEqual(['APP-ACTIVITY-INBOX', 'APP-FAVORITES-GRID', 'APP-MY-WORK']);
      expect(getStarted()).not.toBeNull();
      expect((getStarted().nativeElement as HTMLElement).nextElementSibling!.tagName).toBe('APP-ACTIVITY-INBOX');
    });

    it('stays hidden with a favorite', () => {
      homeFavorites.next([{id: 1} as Favorite]);
      render(true, true);
      activityLoaded(true);

      expect(getStarted()).toBeNull();
    });

    it('goes away once a notification arrives', () => {
      render(true, true);
      activityLoaded(true);

      activityLoaded(false);

      expect(getStarted()).toBeNull();
    });

    it('hides for good in this team when dismissed', () => {
      render(true, true);
      activityLoaded(true);

      getStarted().triggerEventHandler('dismissed');
      fixture.detectChanges();

      expect(getStarted()).toBeNull();
      expect(localStorage.getItem(DISMISSED_KEY)).toBe('true');
    });

    it('stays hidden when it was dismissed before', () => {
      localStorage.setItem(DISMISSED_KEY, 'true');
      fixture = TestBed.createComponent(HomeComponent);
      render(true, true);
      activityLoaded(true);

      expect(getStarted()).toBeNull();
    });

    it('stays hidden when no action is allowed', () => {
      features.next({pages: false, diagrams: false, boards: false, chat: true});
      render(true, true);
      activityLoaded(true);

      expect(getStarted()).toBeNull();
    });

    it('offers the invite alone to an admin when every feature is off', () => {
      role = 'admin';
      features.next({pages: false, diagrams: false, boards: false, chat: true});
      render(true, true);
      activityLoaded(true);

      expect(getStarted()).not.toBeNull();
    });
  });
});

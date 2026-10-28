import {NO_ERRORS_SCHEMA} from '@angular/core';
import {ComponentFixture, TestBed} from '@angular/core/testing';
import {AsyncPipe, NgIf} from '@angular/common';
import {BehaviorSubject} from 'rxjs';
import {provideTranslateService, TranslatePipe} from '@ngx-translate/core';
import {HomeComponent} from './home.component';
import {SettingsService} from '@services/settings.service';
import {UserSettings} from '@models/settings.model';
import {TeamService} from '@services/team.service';
import {TeamFeatures} from '@models/team.model';

describe('HomeComponent', () => {
  let fixture: ComponentFixture<HomeComponent>;
  let settings: BehaviorSubject<UserSettings>;
  let features: BehaviorSubject<TeamFeatures>;

  function render(showFavoritesOnHome: boolean, showMyWorkOnHome: boolean) {
    settings.next({showFavoritesOnHome, showFavoritesInSidebar: true, showMyWorkOnHome, theme: 'purple_haze', themeMode: 'system'});
    fixture.detectChanges();
  }

  function sections(): string[] {
    return Array.from(fixture.nativeElement.querySelectorAll('app-activity-inbox, app-favorites-grid, app-my-work')).map((element) => (element as HTMLElement).tagName);
  }

  beforeEach(async () => {
    settings = new BehaviorSubject<UserSettings>({showFavoritesOnHome: true, showFavoritesInSidebar: true, showMyWorkOnHome: true, theme: 'purple_haze', themeMode: 'system'});
    features = new BehaviorSubject<TeamFeatures>({pages: true, diagrams: true, boards: true});
    await TestBed.configureTestingModule({
      imports: [HomeComponent],
      providers: [
        provideTranslateService(),
        {provide: SettingsService, useValue: {settings$: settings}},
        {provide: TeamService, useValue: {features$: features}},
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
    features.next({pages: true, diagrams: true, boards: false});
    render(true, true);

    expect(sections()).toEqual(['APP-ACTIVITY-INBOX', 'APP-FAVORITES-GRID']);
  });
});

import {NO_ERRORS_SCHEMA} from '@angular/core';
import {ComponentFixture, TestBed} from '@angular/core/testing';
import {AsyncPipe, NgIf} from '@angular/common';
import {BehaviorSubject} from 'rxjs';
import {TranslateModule} from '@ngx-translate/core';
import {HomeComponent} from './home.component';
import {SettingsService} from '@services/settings.service';
import {UserSettings} from '@models/settings.model';

describe('HomeComponent', () => {
  let fixture: ComponentFixture<HomeComponent>;
  let settings: BehaviorSubject<UserSettings>;

  function render(showFavoritesOnHome: boolean, showMyWorkOnHome: boolean) {
    settings.next({showFavoritesOnHome, showFavoritesInSidebar: true, showMyWorkOnHome});
    fixture.detectChanges();
  }

  function has(selector: string): boolean {
    return fixture.nativeElement.querySelector(selector) !== null;
  }

  beforeEach(async () => {
    settings = new BehaviorSubject<UserSettings>({showFavoritesOnHome: true, showFavoritesInSidebar: true, showMyWorkOnHome: true});
    await TestBed.configureTestingModule({
      imports: [HomeComponent, TranslateModule.forRoot()],
      providers: [{provide: SettingsService, useValue: {settings$: settings}}],
    })
      .overrideComponent(HomeComponent, {set: {imports: [AsyncPipe, NgIf, TranslateModule], schemas: [NO_ERRORS_SCHEMA]}})
      .compileComponents();
    fixture = TestBed.createComponent(HomeComponent);
  });

  it('shows My Work below Favorites when both are on', () => {
    render(true, true);

    const sections = Array.from(fixture.nativeElement.querySelectorAll('app-favorites-grid, app-my-work')).map((element) => (element as HTMLElement).tagName);
    expect(sections).toEqual(['APP-FAVORITES-GRID', 'APP-MY-WORK']);
    expect(has('.dashboardStub__body')).toBeFalse();
  });

  it('shows My Work without Favorites', () => {
    render(false, true);

    expect(has('app-favorites-grid')).toBeFalse();
    expect(has('app-my-work')).toBeTrue();
    expect(has('.dashboardStub__body')).toBeFalse();
  });

  it('shows the placeholder only when both are off', () => {
    render(false, false);

    expect(has('app-my-work')).toBeFalse();
    expect(has('.dashboardStub__body')).toBeTrue();
  });
});

import {TestBed} from '@angular/core/testing';
import {provideRouter} from '@angular/router';
import {provideTranslateService} from '@ngx-translate/core';
import {AppComponent} from './app.component';
import {LanguageService} from "@services/language.service";
import {AuthService} from "@services/auth.service";
import {SessionService} from "@services/session.service";

describe('AppComponent', () => {
  async function render(isDashboardRoute: boolean) {
    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [
        provideRouter([]),
        provideTranslateService(),
        {provide: LanguageService, useValue: {initLanguage: () => {}}},
        {provide: AuthService, useValue: {logout: () => {}}},
        {provide: SessionService, useValue: {clear: () => {}, load: () => {}}},
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(AppComponent);
    fixture.componentInstance.isDashboardRoute = isDashboardRoute;
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('renders the page backdrop off dashboard routes', async () => {
    const element = await render(false);

    expect(element.querySelector('.pageBackdrop')).not.toBeNull();
  });

  it('does not render the page backdrop on dashboard routes', async () => {
    const element = await render(true);

    expect(element.querySelector('.pageBackdrop')).toBeNull();
  });
});

import {bootstrapApplication} from '@angular/platform-browser';
import {appConfig} from './app/app/app.config';
import {AppComponent} from './app/app/app.component';
import {applyThemeAttributes, readCachedTheme, resolveMode} from './app/utils/themeDom';

const cachedTheme = readCachedTheme();
applyThemeAttributes(
  document.documentElement,
  cachedTheme.theme,
  resolveMode(cachedTheme.mode, matchMedia('(prefers-color-scheme: dark)').matches),
);

bootstrapApplication(AppComponent, appConfig)
  .catch((err) => console.error(err));

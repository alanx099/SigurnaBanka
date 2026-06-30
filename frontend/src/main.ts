import { bootstrapApplication } from '@angular/platform-browser';
import { registerLocaleData } from '@angular/common';
import localeHr from '@angular/common/locales/hr';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';

registerLocaleData(localeHr);

bootstrapApplication(AppComponent, appConfig).catch((err) =>
  console.error(err),
);

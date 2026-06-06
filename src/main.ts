import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';
import { installNativeBridge } from './app/core/native/native-bridge';

// Wire native (Capacitor) integrations before bootstrap; no-op in a browser.
installNativeBridge();

bootstrapApplication(App, appConfig).catch((err) => console.error(err));

import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  APP_INITIALIZER,
  inject,
  isDevMode,
} from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { appRoutes } from './app.routes';
import { StoreService, initializeStore } from './store/store.service';
import { AppDataService, initializeAppData } from './services/app-data.service';
import { LanguageService } from './services/language.service';
import { provideTransloco, TranslocoService } from '@jsverse/transloco';
import { TranslocoHttpLoader } from './transloco-loader';
import { authInterceptor } from './auth';
import { ThemeAuthBridgeService } from './services/theme-auth-bridge.service';
import 'iconify-icon';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(appRoutes),
    provideHttpClient(withInterceptors([authInterceptor])),
    provideTransloco({
      config: {
        availableLangs: ['en', 'de'],
        defaultLang: 'en',
        reRenderOnLangChange: true,
        prodMode: !isDevMode(),
        fallbackLang: 'en',
        missingHandler: {
          useFallbackTranslation: true,
          logMissingKey: isDevMode(),
        },
      },
      loader: TranslocoHttpLoader,
    }),
    // Initialize language service to set up language from localStorage/env/browser
    {
      provide: APP_INITIALIZER,
      useFactory: () => {
        const languageService = inject(LanguageService);
        const translocoService = inject(TranslocoService);
        return () => {
          // Set the language first
          const initialLang = languageService.getLanguage();
          // Wait for the translation to load before app starts
          return firstValueFrom(translocoService.load(initialLang));
        };
      },
      multi: true,
      deps: [LanguageService, TranslocoService],
    },
    // Theme: prefer OS theme when not authenticated; lock/persist on login
    {
      provide: APP_INITIALIZER,
      useFactory: () => {
        inject(ThemeAuthBridgeService);
        return () => void 0;
      },
      multi: true,
    },
    // Central Store + ActionMetadata load in parallel
    {
      provide: APP_INITIALIZER,
      useFactory: initializeStore,
      deps: [StoreService],
      multi: true,
    },
    {
      provide: APP_INITIALIZER,
      useFactory: initializeAppData,
      deps: [AppDataService],
      multi: true,
    },
  ],
};

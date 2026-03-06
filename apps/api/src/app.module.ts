import { Module, OnModuleInit } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_INTERCEPTOR, APP_GUARD } from '@nestjs/core';
import { CatchEverythingFilter } from './_filters/catch-all.filter';
import { HttpCacheInterceptor } from './_interceptors/cache.interceptor';
import { EventLogger } from './_logger/event-logger';
import { ScrapeLogger } from './_logger/scrape-logger.service';
import { ModuleRef } from '@nestjs/core';
import { DatabaseModule } from './database/database.module';
import { SecretsModule } from './secrets/secrets.module';
import { VariablesModule } from './variables/variables.module';
import { HealthModule } from './health/health.module';
import { ScrapeModule } from './scrape/scrape.module';
import { ScrapeEventsService } from './scrape/scrape-events.service';
import { EventsModule } from './events/events.module';
import { FilesModule } from './files/files.module';
import { AuthModule, JwtAuthGuard } from './auth';
import { ConfigService } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '.env.local'],
    }),
    DatabaseModule,
    AuthModule,
    SecretsModule,
    VariablesModule,
    HealthModule,
    EventsModule,
    ScrapeModule,
    FilesModule,
  ],
  controllers: [],
  providers: [
    EventLogger,
    ScrapeLogger,
    {
      provide: APP_FILTER,
      useClass: CatchEverythingFilter,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: HttpCacheInterceptor,
    },
    // Global JWT Auth Guard - can be disabled via SCRAPE_DOJO_AUTH_ENABLED=false
    {
      provide: APP_GUARD,
      useFactory: (
        configService: ConfigService,
        jwtAuthGuard: JwtAuthGuard,
      ) => {
        const authEnabled =
          configService.get<string>('SCRAPE_DOJO_AUTH_ENABLED', 'true') ===
          'true';
        if (!authEnabled) {
          return { canActivate: () => true };
        }
        return jwtAuthGuard;
      },
      inject: [ConfigService, JwtAuthGuard],
    },
  ],
  exports: [ScrapeLogger],
})
export class AppModule implements OnModuleInit {
  constructor(
    private moduleRef: ModuleRef,
    private eventsService: ScrapeEventsService,
  ) {}

  onModuleInit() {
    // EventLogger mit dem EventsService verbinden
    EventLogger.setEventsService(this.eventsService);
  }
}

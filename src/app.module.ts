import { Module } from '@nestjs/common';
import { ScrapeService } from './scrape/scrape.service';
import { ScrapeController } from './scrape/scrape.controller';
import { PuppeteerService } from './puppeteer/puppeteer.service';
import { ActionHandlerService } from './action-handler/action-handler.service';
import { APP_FILTER } from '@nestjs/core';
import { CatchEverythingFilter } from './_filters/catch-all.filter';

@Module({
  imports: [],
  controllers: [ScrapeController],
  providers: [
    ScrapeService, 
    PuppeteerService, 
    ActionHandlerService,
    {
      provide: APP_FILTER,
      useClass: CatchEverythingFilter,
    },
  ],
})
export class AppModule {}

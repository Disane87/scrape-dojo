import { Module } from '@nestjs/common';
import { ScrapeService } from './scrape/scrape.service';
import { ScrapeController } from './scrape/scrape.controller';
import { PuppeteerService } from './puppeteer/puppeteer.service';
import { ActionHandlerService } from './action-handler/action-handler.service';

@Module({
  imports: [],
  controllers: [ScrapeController],
  providers: [ScrapeService, PuppeteerService, ActionHandlerService],
})
export class AppModule {}

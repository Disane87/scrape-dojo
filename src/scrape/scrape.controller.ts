import { Controller, Get, Param } from '@nestjs/common';
import { ScrapeService } from './scrape.service';

@Controller('scrape')
export class ScrapeController {
    constructor(private scrapeService: ScrapeService) {}
    @Get(':scrapeId')
    scrape(@Param('scrapeId') scrapeId: string) {
        // Hier wird der Code für das Scrapen implementiert
        // const scrape = this.puppeteerService.
        return this.scrapeService.scrape(scrapeId);
    }
}

import { Controller, Get, Param, Post } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';
import { ScrapeService } from './scrape.service';

@ApiTags('scrapes')
@Controller('scrape')
export class ScrapeController {
  constructor(private scrapeService: ScrapeService) {}

  // WICHTIG: Spezifische Routen MÜSSEN vor parametrisierten Routen stehen!
  @Post('stop')
  @ApiOperation({
    summary: 'Stop running scrape',
    description: 'Stops the currently running scrape operation',
  })
  @ApiResponse({ status: 200, description: 'Scrape stopped successfully' })
  @ApiResponse({ status: 404, description: 'No running scrape found' })
  async stopScrape() {
    return this.scrapeService.stopScrape();
  }

  @Get(':scrapeId')
  @ApiOperation({
    summary: 'Start scraping',
    description: 'Starts a scraping job with the specified configuration ID',
  })
  @ApiParam({
    name: 'scrapeId',
    description: 'The ID of the scrape configuration to execute',
    example: 'amazon-orders',
  })
  @ApiResponse({
    status: 200,
    description: 'Scraping started successfully',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'running' },
        scrapeId: { type: 'string', example: 'amazon-orders' },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Scrape configuration not found' })
  scrape(@Param('scrapeId') scrapeId: string) {
    // Hier wird der Code für das Scrapen implementiert
    // const scrape = this.puppeteerService.
    return this.scrapeService.scrape(scrapeId);
  }
}

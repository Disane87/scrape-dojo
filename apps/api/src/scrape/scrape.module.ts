import { Module, forwardRef } from '@nestjs/common';
import { ScrapeService } from './scrape.service';
import { ScrapeController } from './scrape.controller';
import { ScrapeUIController } from './scrape-ui.controller';
import { ScrapeEventsService } from './scrape-events.service';
import { AuthorResolverService } from './author-resolver.service';
import { SchedulerService } from './scheduler.service';
import { SecretsModule } from '../secrets/secrets.module';
import { DatabaseModule } from '../database/database.module';
import { ActionHandlerService } from '../action-handler/action-handler.service';
import { ActionsController } from '../action-handler/actions.controller';
import { PuppeteerService } from '../puppeteer/puppeteer.service';
import { VariablesModule } from '../variables/variables.module';
import { ScrapeConfigService } from './services/scrape-config.service';
import { ScrapeVariablesSyncService } from './services/scrape-variables-sync.service';
import { ScrapeSecretsResolverService } from './services/scrape-secrets-resolver.service';
import { ScrapeExecutionService } from './services/scrape-execution.service';
import { ScrapeDataService } from './services/scrape-data.service';
import { ScrapeValidationService } from './services/scrape-validation.service';
import { ActionFactory } from '../action-handler/factories/action.factory';
import { VariableResolutionStrategy } from '../action-handler/strategies/variable-resolution.strategy';
import { ActionExecutionStrategy } from '../action-handler/strategies/action-execution.strategy';
import { SseTicketService } from './sse-ticket.service';
import { ScrapeLogger } from '../_logger/scrape-logger.service';

@Module({
  imports: [
    SecretsModule,
    forwardRef(() => DatabaseModule),
    forwardRef(() => VariablesModule),
  ],
  controllers: [ScrapeController, ScrapeUIController, ActionsController],
  providers: [
    ScrapeService,
    ScrapeEventsService,
    AuthorResolverService,
    SchedulerService,
    ActionHandlerService,
    PuppeteerService,
    ScrapeConfigService,
    ScrapeVariablesSyncService,
    ScrapeSecretsResolverService,
    ScrapeExecutionService,
    ScrapeDataService,
    ScrapeValidationService,
    ActionFactory,
    VariableResolutionStrategy,
    ActionExecutionStrategy,
    ScrapeLogger,
    SseTicketService,
  ],
  exports: [
    ScrapeService,
    ScrapeEventsService,
    AuthorResolverService,
    SchedulerService,
    SseTicketService,
  ],
})
export class ScrapeModule {}

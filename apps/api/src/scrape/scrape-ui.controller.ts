import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Res,
  HttpStatus,
  Sse,
  Param,
  Query,
  Delete,
  NotFoundException,
} from '@nestjs/common';
import { Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'comment-json';
import { ScrapeService } from './scrape.service';
import { ScrapeEventsService } from './scrape-events.service';
import { SchedulerService } from './scheduler.service';
import { DatabaseService } from '../database/database.service';
import { AuthorResolverService } from './author-resolver.service';
import { ScrapeConfigService } from './services/scrape-config.service';
import { Observable, map } from 'rxjs';
import * as jsonata from 'jsonata';
import { Scrape, Scrapes } from './types/scrape.interface';

interface MessageEvent {
  data: string;
}

interface UpdateScheduleDTO {
  manualEnabled?: boolean;
  scheduleEnabled?: boolean;
  cronExpression?: string | null;
  timezone?: string;
}

@Controller()
export class ScrapeUIController {
  constructor(
    private scrapeService: ScrapeService,
    private scrapeEventsService: ScrapeEventsService,
    private schedulerService: SchedulerService,
    private databaseService: DatabaseService,
    private authorResolverService: AuthorResolverService,
    private configService: ScrapeConfigService,
  ) {}

  @Get('scrapes')
  async getScrapes() {
    try {
      const definitions = this.scrapeService.getScrapeDefinitions();
      const lastRuns = await this.databaseService.getLastRunForEachScrape();

      // Transform to ScrapeListItem format for the UI with resolved author data
      const scrapes = await Promise.all(
        definitions.map(async (scrape) => {
          const resolvedMetadata =
            await this.authorResolverService.resolveMetadata(scrape.metadata);

          // Resolve dynamic options for select variables
          if (resolvedMetadata?.variables) {
            resolvedMetadata.variables = await this.resolveVariableOptions(
              resolvedMetadata.variables,
            );
          }

          // Get last run info for this scrape
          const lastRunInfo = lastRuns.get(scrape.id);
          const lastRun = lastRunInfo
            ? {
                status: this.mapRunStatus(lastRunInfo.status),
                startTime: lastRunInfo.startTime?.getTime() || Date.now(),
                endTime: lastRunInfo.endTime?.getTime(),
              }
            : undefined;

          return {
            id: scrape.id,
            stepsCount: scrape.steps?.length || 0,
            metadata: resolvedMetadata,
            source:
              this.configService.getWorkflowSource(scrape.id) ?? 'builtin',
            lastRun,
          };
        }),
      );
      return scrapes;
    } catch (error) {
      throw new Error(`Failed to load scrapes: ${error.message}`);
    }
  }

  @Post('scrapes/reload')
  async reloadScrapes() {
    await this.scrapeService.reloadScrapeDefinitions();
    return { success: true };
  }

  private mapRunStatus(status: string): 'running' | 'completed' | 'failed' {
    switch (status) {
      case 'running':
        return 'running';
      case 'completed':
        return 'completed';
      case 'failed':
        return 'failed';
      default:
        return 'completed';
    }
  }

  /**
   * Resolve dynamic options for select variables using JSONata expressions
   */
  private async resolveVariableOptions(variables: any[]): Promise<any[]> {
    const now = new Date();
    const context = {
      year: now.getFullYear(),
      month: now.getMonth() + 1,
      day: now.getDate(),
    };

    return Promise.all(
      variables.map(async (variable) => {
        if (variable.type === 'select' && variable.optionsExpression) {
          try {
            const expression = jsonata(variable.optionsExpression);
            const result = await expression.evaluate(context);

            // Ensure result is an array with proper structure
            if (Array.isArray(result)) {
              return {
                ...variable,
                options: result.map((opt) => ({
                  value: String(opt.value ?? opt),
                  label: String(opt.label ?? opt.value ?? opt),
                })),
              };
            }
          } catch (error) {
            console.error(
              `Error evaluating optionsExpression for ${variable.name}:`,
              error,
            );
          }
        }
        return variable;
      }),
    );
  }

  @Get('scrapes/:id')
  async getScrapeById(@Param('id') id: string) {
    const definitions = this.scrapeService.getScrapeDefinitions();
    const scrape = definitions.find((s) => s.id === id);
    if (!scrape) {
      throw new NotFoundException(`Scrape with id ${id} not found`);
    }

    // Resolve dynamic options for select variables
    if (scrape.metadata?.variables) {
      scrape.metadata.variables = await this.resolveVariableOptions(
        scrape.metadata.variables,
      );
    }

    return scrape;
  }

  @Post('run/:scrapeId')
  async runScrape(
    @Body() body: { runId?: string; variables?: Record<string, any> },
    @Res() res: Response,
  ) {
    const scrapeId = res.req.params.scrapeId;
    const runId = body?.runId;
    const variables = body?.variables;

    try {
      const result = await this.scrapeService.scrape(
        scrapeId,
        runId,
        variables,
      );
      res.status(HttpStatus.OK).json(result);
    } catch (error) {
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        error: 'Scrape execution failed',
        message: error.message,
      });
    }
  }

  /**
   * Server-Sent Events für Live-Status-Updates
   */
  @Sse('events')
  events(): Observable<MessageEvent> {
    return this.scrapeEventsService.getEvents().pipe(
      map((event) => ({
        data: JSON.stringify(event),
      })),
    );
  }

  /**
   * SSE-Verbindungsstatus abrufen
   */
  @Get('events/status')
  getEventsStatus() {
    return this.scrapeEventsService.getConnectionStatus();
  }

  /**
   * SSE-Verbindung testen (sendet Ping an alle Clients)
   */
  @Post('events/ping')
  pingEvents() {
    return this.scrapeEventsService.pingConnections();
  }

  /**
   * Gespeicherte Logs und Workflow-Events abrufen
   * Kombiniert File-basierte Logs mit In-Memory Workflow-Events
   */
  @Get('logs')
  getLogs() {
    const logs = this.scrapeEventsService.getStoredLogs(500);
    const workflowEvents = this.scrapeEventsService.getWorkflowEvents(500);

    // Kombinieren und nach Timestamp sortieren
    const allEvents = [...logs, ...workflowEvents];
    allEvents.sort((a, b) => a.timestamp - b.timestamp);

    // Letzte 500 Events zurückgeben
    return allEvents.slice(-500);
  }

  /**
   * Gespeicherte Logs löschen
   */
  @Post('logs/clear')
  clearLogs(@Res() res: Response) {
    this.scrapeEventsService.clearStoredLogs();
    this.scrapeEventsService.clearWorkflowEvents();
    res.status(HttpStatus.OK).json({ success: true });
  }

  /**
   * OTP-Alternative ausführen (z.B. WhatsApp-Button klicken)
   */
  @Post('otp-action/:requestId')
  async executeOtpAction(
    @Param('requestId') requestId: string,
    @Body() body: { selector: string },
    @Res() res: Response,
  ) {
    try {
      const success = await this.scrapeEventsService.executeOtpAction(
        requestId,
        body.selector,
      );
      res
        .status(success ? HttpStatus.OK : HttpStatus.BAD_REQUEST)
        .json({ success });
    } catch (error) {
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        error: 'OTP action failed',
        message: error.message,
      });
    }
  }

  /**
   * OTP-Code einreichen
   */
  @Post('otp/:requestId')
  submitOtp(
    @Param('requestId') requestId: string,
    @Body() body: { code: string },
    @Res() res: Response,
  ) {
    try {
      this.scrapeEventsService.submitOtp(requestId, body.code);
      res.status(HttpStatus.OK).json({ success: true });
    } catch (error) {
      res.status(HttpStatus.BAD_REQUEST).json({
        error: 'OTP submission failed',
        message: error.message,
      });
    }
  }

  // ============ Run History Endpoints ============

  /**
   * Alle Runs abrufen (optional nach scrapeId gefiltert)
   */
  @Get('runs')
  async getRuns(
    @Query('scrapeId') scrapeId?: string,
    @Query('limit') limit = 50,
  ) {
    const runs = scrapeId
      ? await this.databaseService.getRunsByScrapeId(scrapeId, Number(limit))
      : await this.databaseService.getRecentRuns(Number(limit));

    return runs
      .map((run) => {
        if (!run) return null;

        const runDto = this.databaseService.toRunHistoryDTO(run);

        // Enriche mit Workflow-Struktur
        try {
          if (run.scrapeId) {
            const scrapeDefinition = this.scrapeService
              .getScrapeDefinitions()
              .find((s) => s.id === run.scrapeId);
            if (scrapeDefinition && scrapeDefinition.steps) {
              runDto.steps = this.enrichStepsWithNestedActions(
                runDto.steps || [],
                scrapeDefinition.steps,
              );
            }
          }
        } catch (error) {
          // Falls Scrape-Definition nicht mehr existiert, gebe trotzdem Daten zurück
          console.warn(
            `Could not enrich run ${run.id}:`,
            error?.message || error,
          );
        }

        return runDto;
      })
      .filter((run) => run !== null);
  }

  /**
   * Einzelnen Run mit Details abrufen
   */
  @Get('runs/:runId')
  async getRunById(@Param('runId') runId: string, @Res() res: Response) {
    const run = await this.databaseService.getRun(runId);

    if (!run) {
      res.status(HttpStatus.NOT_FOUND).json({
        error: 'Run not found',
        message: `Run with id ${runId} not found`,
      });
      return;
    }

    const runDto = this.databaseService.toRunHistoryDTO(run);

    // Enriche mit Workflow-Struktur für nestedActions
    try {
      if (run.scrapeId) {
        const scrapeDefinition = this.scrapeService
          .getScrapeDefinitions()
          .find((s) => s.id === run.scrapeId);
        if (scrapeDefinition && scrapeDefinition.steps) {
          runDto.steps = this.enrichStepsWithNestedActions(
            runDto.steps || [],
            scrapeDefinition.steps,
          );
        }
      }
    } catch (error) {
      // Falls Scrape-Definition nicht mehr existiert, gebe trotzdem Daten zurück
      console.warn(
        `Could not enrich run ${runId} with workflow structure:`,
        error?.message || error,
      );
    }

    res.status(HttpStatus.OK).json(runDto);
  }

  /**
   * Debug-Daten für einen Run abrufen
   */
  @Get('runs/:runId/debug')
  async getRunDebugData(@Param('runId') runId: string, @Res() res: Response) {
    try {
      const run = await this.databaseService.getRun(runId);
      if (!run) {
        res.status(HttpStatus.NOT_FOUND).json({
          error: 'Run not found',
          message: `Run with id ${runId} not found`,
        });
        return;
      }

      // Load debug data from ScrapeData table
      const scrapeDataRepo =
        this.databaseService.dataSource.getRepository('ScrapeData');
      const debugDataEntry = await scrapeDataRepo.findOne({
        where: {
          scrapeId: run.scrapeId,
          runId: runId,
          key: '__debugData',
        },
      });

      if (!debugDataEntry) {
        res.status(HttpStatus.OK).json({});
        return;
      }

      const debugData = JSON.parse(debugDataEntry.value);
      res.status(HttpStatus.OK).json(debugData);
    } catch (error) {
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        error: 'Failed to load debug data',
        message: error.message,
      });
    }
  }

  /**
   * Artifacts für einen Run abrufen
   */
  @Get('runs/:runId/artifacts')
  async getRunArtifacts(@Param('runId') runId: string, @Res() res: Response) {
    try {
      const run = await this.databaseService.getRun(runId);
      if (!run) {
        res.status(HttpStatus.NOT_FOUND).json({
          error: 'Run not found',
          message: `Run with id ${runId} not found`,
        });
        return;
      }

      // Load debug data from ScrapeData table
      const scrapeDataRepo =
        this.databaseService.dataSource.getRepository('ScrapeData');
      const debugDataEntry = await scrapeDataRepo.findOne({
        where: {
          scrapeId: run.scrapeId,
          runId: runId,
          key: '__debugData',
        },
      });

      if (!debugDataEntry) {
        res.status(HttpStatus.OK).json([]);
        return;
      }

      const debugData = JSON.parse(debugDataEntry.value);

      // Extract artifacts from debug data
      // Strategy: Only extract artifacts from the deepest loop level to avoid duplicates
      // Root-level artifacts that also appear in loops are skipped

      const artifacts: any[] = [];
      const seenContent = new Set<string>(); // Deduplicate by content

      const extractArtifacts = (obj: any, path: string = '') => {
        if (!obj || typeof obj !== 'object') return;

        // Check if this is an artifact
        if (
          obj.type &&
          obj.data !== undefined &&
          [
            'auto',
            'json',
            'table',
            'text',
            'file',
            'image',
            'link',
            'card',
          ].includes(obj.type)
        ) {
          // Create content hash for deduplication
          const contentKey = JSON.stringify({
            type: obj.type,
            title: obj.title,
            template: obj.template,
            dataStr:
              typeof obj.data === 'string'
                ? obj.data
                : JSON.stringify(obj.data),
          });

          if (!seenContent.has(contentKey)) {
            seenContent.add(contentKey);
            artifacts.push({
              ...obj,
              _path: path,
            });
          }
          return;
        }

        // Recurse into nested objects/arrays
        if (Array.isArray(obj)) {
          obj.forEach((item, idx) => extractArtifacts(item, `${path}[${idx}]`));
        } else {
          // Process deepest loops first by sorting keys
          // This ensures we see loop iteration artifacts before root-level duplicates
          const keys = Object.keys(obj).sort((a, b) => {
            // Process loop structures (loopXXX) before their root-level action equivalents
            const aIsLoop =
              a.startsWith('loop') &&
              obj[a] &&
              typeof obj[a] === 'object' &&
              Object.keys(obj[a]).some((k) => k.startsWith('iteration_'));
            const bIsLoop =
              b.startsWith('loop') &&
              obj[b] &&
              typeof obj[b] === 'object' &&
              Object.keys(obj[b]).some((k) => k.startsWith('iteration_'));
            if (aIsLoop && !bIsLoop) return -1;
            if (!aIsLoop && bIsLoop) return 1;
            return 0;
          });

          keys.forEach((key) => {
            extractArtifacts(obj[key], path ? `${path}.${key}` : key);
          });
        }
      };

      extractArtifacts(debugData);
      res.status(HttpStatus.OK).json(artifacts);
    } catch (error) {
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        error: 'Failed to load artifacts',
        message: error.message,
      });
    }
  }

  /**
   * Reichert Steps mit nestedActions aus der Workflow-Definition an
   */
  private enrichStepsWithNestedActions(
    runSteps: any[],
    configSteps: any[],
  ): any[] {
    if (!runSteps || !configSteps) return runSteps || [];

    return runSteps.map((runStep, stepIndex) => {
      const configStep = configSteps[stepIndex];
      if (!configStep) return runStep;

      return {
        ...runStep,
        actions: this.enrichActionsRecursively(
          runStep.actions || [],
          configStep.actions || [],
        ),
      };
    });
  }

  /**
   * Reichert Actions rekursiv mit nestedActions an
   */
  private enrichActionsRecursively(
    runActions: any[],
    configActions: any[],
  ): any[] {
    if (!runActions || !configActions) return runActions || [];

    return runActions.map((runAction, actionIndex) => {
      const configAction = configActions[actionIndex];
      if (!configAction) return runAction;

      const enrichedAction = { ...runAction };

      // Wenn die Action ein Loop ist, füge nestedActions hinzu
      if (configAction.action === 'loop' && configAction.params?.actions) {
        const nestedConfigActions = configAction.params.actions;

        // Template für neue Iterationen
        enrichedAction.nestedActions =
          this.buildNestedActionsTemplate(nestedConfigActions);

        // Existierende loopIterations mit childActions anreichern
        if (
          enrichedAction.loopIterations &&
          Array.isArray(enrichedAction.loopIterations)
        ) {
          enrichedAction.loopIterations = enrichedAction.loopIterations.map(
            (iteration: any) => ({
              ...iteration,
              childActions: iteration.childActions
                ? this.enrichActionsRecursively(
                    iteration.childActions,
                    nestedConfigActions,
                  )
                : undefined,
            }),
          );
        }
      }

      return enrichedAction;
    });
  }

  /**
   * Baut das nestedActions Template für Loop-Actions
   */
  private buildNestedActionsTemplate(configActions: any[]): any[] {
    return configActions.map((configAction: any) => ({
      name: configAction.name || configAction.action,
      actionType: configAction.action,
      status: 'pending',
      // Rekursiv für verschachtelte Loops
      nestedActions:
        configAction.action === 'loop' && configAction.params?.actions
          ? this.buildNestedActionsTemplate(configAction.params.actions)
          : undefined,
    }));
  }

  /**
   * Run löschen
   */
  @Delete('runs/:runId')
  async deleteRun(@Param('runId') runId: string, @Res() res: Response) {
    try {
      await this.databaseService.deleteRun(runId);
      // Auch die in-memory Events für diesen Run löschen
      this.scrapeEventsService.clearWorkflowEventsForRun(runId);
      res.status(HttpStatus.OK).json({ success: true });
    } catch (error) {
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        error: 'Delete failed',
        message: error.message,
      });
    }
  }

  /**
   * Alle Runs eines Scrapes löschen
   */
  @Delete('scrapes/:scrapeId/runs')
  async deleteRunsByScrapeId(
    @Param('scrapeId') scrapeId: string,
    @Res() res: Response,
  ) {
    try {
      const deleted = await this.databaseService.deleteRunsByScrapeId(scrapeId);
      // Auch die in-memory Events für diesen Scrape löschen
      this.scrapeEventsService.clearWorkflowEventsForScrape(scrapeId);
      res.status(HttpStatus.OK).json({ success: true, deleted });
    } catch (error) {
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        error: 'Delete failed',
        message: error.message,
      });
    }
  }

  /**
   * Alte Runs aufräumen
   */
  @Post('runs/cleanup')
  async cleanupRuns(
    @Body() body: { olderThanDays?: number },
    @Res() res: Response,
  ) {
    try {
      await this.databaseService.clearOldData(body?.olderThanDays || 30);
      res.status(HttpStatus.OK).json({ success: true });
    } catch (error) {
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        error: 'Cleanup failed',
        message: error.message,
      });
    }
  }

  // ============ Scrape Data Endpoints ============

  /**
   * Job-Level Daten für einen Scrape abrufen (persistent über alle Runs)
   */
  @Get('scrapes/:scrapeId/data')
  async getScrapeData(@Param('scrapeId') scrapeId: string) {
    const data = await this.databaseService.getJobData(scrapeId);
    return data.map((d) => this.databaseService.toScrapeDataDTO(d));
  }

  /**
   * Daten für einen spezifischen Run abrufen
   */
  @Get('runs/:runId/data')
  async getRunData(@Param('runId') runId: string) {
    const data = await this.databaseService.getRunDataByRunId(runId);
    return data.map((d) => this.databaseService.toScrapeDataDTO(d));
  }

  /**
   * Alle Daten für einen Scrape (Job-Level + alle Runs)
   */
  @Get('scrapes/:scrapeId/data/all')
  async getAllScrapeData(@Param('scrapeId') scrapeId: string) {
    const { jobLevel, runs } =
      await this.databaseService.getAllScrapeData(scrapeId);
    return {
      jobLevel: jobLevel.map((d) => this.databaseService.toScrapeDataDTO(d)),
      runs: Object.fromEntries(
        Object.entries(runs).map(([runId, data]) => [
          runId,
          data.map((d) => this.databaseService.toScrapeDataDTO(d)),
        ]),
      ),
    };
  }

  // ============ Schedule Endpoints ============

  /**
   * Get schedule for a specific scrape
   */
  @Get('scrapes/:scrapeId/schedule')
  async getSchedule(@Param('scrapeId') scrapeId: string) {
    const schedule = await this.databaseService.getSchedule(scrapeId);
    const dto = this.databaseService.toScheduleDTO(schedule);

    if (!dto) {
      // Return default schedule if none exists
      return {
        scrapeId,
        manualEnabled: true,
        scheduleEnabled: false,
        cronExpression: null,
        timezone: 'Europe/Berlin',
        lastScheduledRun: null,
        nextScheduledRun: null,
      };
    }

    return dto;
  }

  /**
   * Get all schedules
   */
  @Get('schedules')
  async getAllSchedules() {
    const schedules = await this.databaseService.getAllSchedules();
    return schedules.map((s) => this.databaseService.toScheduleDTO(s));
  }

  /**
   * Update schedule for a scrape
   */
  @Put('scrapes/:scrapeId/schedule')
  async updateSchedule(
    @Param('scrapeId') scrapeId: string,
    @Body() body: UpdateScheduleDTO,
  ) {
    const schedule = await this.databaseService.updateScheduleConfig(
      scrapeId,
      body,
    );

    // Sync scheduler with new settings
    if (
      body.scheduleEnabled !== undefined ||
      body.cronExpression !== undefined
    ) {
      if (schedule.scheduleEnabled && schedule.cronExpression) {
        await this.schedulerService.scheduleJob(
          scrapeId,
          schedule.cronExpression,
          schedule.timezone,
        );
      } else {
        this.schedulerService.removeJob(scrapeId);
      }
    }

    return this.databaseService.toScheduleDTO(schedule);
  }

  /**
   * Get scheduler status (all active jobs)
   */
  @Get('scheduler/status')
  getSchedulerStatus() {
    return this.schedulerService.getStatus();
  }

  // ============ Workflow CRUD Endpoints ============

  /**
   * JSON Schema für Workflow-Konfigurationen abrufen
   */
  @Get('schema')
  getSchema(@Res() res: Response) {
    const schemaPath = path.join(
      process.cwd(),
      'config',
      'scrapes.schema.json',
    );
    if (!fs.existsSync(schemaPath)) {
      res.status(HttpStatus.NOT_FOUND).json({ error: 'Schema not found' });
      return;
    }
    const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf-8'));
    res.status(HttpStatus.OK).json(schema);
  }

  /**
   * Neuen Custom-Workflow erstellen
   */
  @Post('scrapes')
  async createScrape(@Body() body: Scrape, @Res() res: Response) {
    try {
      if (!body.id || !body.steps) {
        res.status(HttpStatus.BAD_REQUEST).json({
          error: 'Invalid workflow',
          message: 'Workflow must have an "id" and "steps" array',
        });
        return;
      }

      // Check for duplicate ID
      const existing = this.scrapeService
        .getScrapeDefinitions()
        .find((s) => s.id === body.id);
      if (existing) {
        res.status(HttpStatus.CONFLICT).json({
          error: 'Duplicate ID',
          message: `A workflow with id "${body.id}" already exists`,
        });
        return;
      }

      this.configService.saveCustomWorkflow(body);
      await this.scrapeService.reloadScrapeDefinitions();

      res.status(HttpStatus.CREATED).json(body);
    } catch (error) {
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        error: 'Failed to create workflow',
        message: error.message,
      });
    }
  }

  /**
   * Custom-Workflow aktualisieren (nur für custom workflows)
   */
  @Put('scrapes/:id')
  async updateScrape(
    @Param('id') id: string,
    @Body() body: Scrape,
    @Res() res: Response,
  ) {
    try {
      const source = this.configService.getWorkflowSource(id);
      if (source === 'builtin') {
        res.status(HttpStatus.FORBIDDEN).json({
          error: 'Read-only workflow',
          message: 'Built-in workflows cannot be modified',
        });
        return;
      }

      if (!source) {
        res.status(HttpStatus.NOT_FOUND).json({
          error: 'Workflow not found',
          message: `Workflow with id "${id}" not found`,
        });
        return;
      }

      this.configService.updateCustomWorkflow(id, body);
      await this.scrapeService.reloadScrapeDefinitions();

      res.status(HttpStatus.OK).json(body);
    } catch (error) {
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        error: 'Failed to update workflow',
        message: error.message,
      });
    }
  }

  /**
   * Custom-Workflow löschen (nur für custom workflows)
   */
  @Delete('scrapes/:id')
  async deleteScrape(@Param('id') id: string, @Res() res: Response) {
    try {
      const source = this.configService.getWorkflowSource(id);
      if (source === 'builtin') {
        res.status(HttpStatus.FORBIDDEN).json({
          error: 'Read-only workflow',
          message: 'Built-in workflows cannot be deleted',
        });
        return;
      }

      if (!source) {
        res.status(HttpStatus.NOT_FOUND).json({
          error: 'Workflow not found',
          message: `Workflow with id "${id}" not found`,
        });
        return;
      }

      this.configService.deleteCustomWorkflow(id);
      await this.scrapeService.reloadScrapeDefinitions();

      res.status(HttpStatus.OK).json({ success: true });
    } catch (error) {
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        error: 'Failed to delete workflow',
        message: error.message,
      });
    }
  }

  /**
   * Workflow als JSONC exportieren (Download)
   */
  @Get('scrapes/:id/export')
  exportScrape(@Param('id') id: string, @Res() res: Response) {
    try {
      const content = this.configService.getWorkflowFileContent(id);
      if (!content) {
        res.status(HttpStatus.NOT_FOUND).json({
          error: 'Workflow not found',
          message: `Workflow with id "${id}" not found`,
        });
        return;
      }

      res.setHeader('Content-Type', 'application/json');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${id}.jsonc"`,
      );
      res.status(HttpStatus.OK).send(content);
    } catch (error) {
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        error: 'Failed to export workflow',
        message: error.message,
      });
    }
  }

  /**
   * Workflow aus JSONC importieren
   */
  @Post('scrapes/import')
  async importScrape(@Body() body: any, @Res() res: Response) {
    try {
      let content: string | undefined;
      let scrapes: Scrape[] | undefined;

      // Accept either raw JSONC string or parsed JSON object
      if (typeof body === 'string') {
        content = body;
      } else if (body && typeof body === 'object') {
        // Already parsed - handle both formats
        if (Array.isArray(body)) {
          scrapes = body as Scrape[];
        } else if (body.scrapes && Array.isArray(body.scrapes)) {
          scrapes = body.scrapes as Scrape[];
        } else if (body.id && body.steps) {
          scrapes = [body as Scrape];
        } else if (body.content && typeof body.content === 'string') {
          content = body.content;
        } else {
          res.status(HttpStatus.BAD_REQUEST).json({
            error: 'Invalid import format',
            message:
              'Expected a workflow object, an array of workflows, or an object with "scrapes" array',
          });
          return;
        }
      } else {
        res.status(HttpStatus.BAD_REQUEST).json({
          error: 'Invalid import format',
          message: 'Request body is empty or invalid',
        });
        return;
      }

      // Parse JSONC content if needed
      if (!scrapes && content) {
        try {
          const parsed = parse(content, null, true);
          if (Array.isArray(parsed)) {
            scrapes = parsed as unknown as Scrape[];
          } else if (
            parsed &&
            typeof parsed === 'object' &&
            'scrapes' in (parsed as any)
          ) {
            scrapes = (parsed as unknown as Scrapes)
              .scrapes as unknown as Scrape[];
          } else if (
            parsed &&
            typeof parsed === 'object' &&
            'id' in (parsed as any)
          ) {
            scrapes = [parsed as unknown as Scrape];
          } else {
            res.status(HttpStatus.BAD_REQUEST).json({
              error: 'Invalid import format',
              message: 'Could not parse workflow from the provided content',
            });
            return;
          }
        } catch (parseError) {
          res.status(HttpStatus.BAD_REQUEST).json({
            error: 'Parse error',
            message: `Invalid JSONC: ${parseError.message}`,
          });
          return;
        }
      }

      if (!scrapes) {
        res.status(HttpStatus.BAD_REQUEST).json({
          error: 'Invalid import format',
          message: 'No workflow data found in the request',
        });
        return;
      }

      // Validate and import each scrape
      const existingIds = new Set(
        this.scrapeService.getScrapeDefinitions().map((s) => s.id),
      );
      const imported: string[] = [];
      const conflicts: string[] = [];

      for (const scrape of scrapes) {
        if (!scrape.id || !scrape.steps) {
          continue;
        }

        if (existingIds.has(scrape.id)) {
          conflicts.push(scrape.id);
          continue;
        }

        this.configService.saveCustomWorkflow(scrape);
        imported.push(scrape.id);
        existingIds.add(scrape.id);
      }

      if (imported.length > 0) {
        await this.scrapeService.reloadScrapeDefinitions();
      }

      res.status(HttpStatus.OK).json({
        success: true,
        imported,
        conflicts,
      });
    } catch (error) {
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        error: 'Failed to import workflow',
        message: error.message,
      });
    }
  }
}

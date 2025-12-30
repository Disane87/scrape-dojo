import { Controller, Get, Post, Put, Delete, Body, Param, Query, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { VariablesService, Variable, VariableListItem, VariableScope } from './variables.service';
import { ScrapeService } from '../scrape/scrape.service';
import { CreateVariableDto, UpdateVariableDto } from './dto';

/**
 * API Controller für Variablen-Management
 */
@Controller('variables')
export class VariablesController {
  private readonly logger = new Logger(VariablesController.name);

  constructor(
    private readonly variablesService: VariablesService,
    private readonly scrapeService: ScrapeService
  ) { }

  /**
   * GET /api/variables - Alle Variablen abrufen
   * Query params: scope, workflowId
   */
  @Get()
  async getAll(
    @Query('scope') scope?: VariableScope,
    @Query('workflowId') workflowId?: string
  ): Promise<VariableListItem[]> {
    return this.variablesService.getAll(scope, workflowId);
  }

  /**
   * GET /api/variables/global - Nur globale Variablen
   */
  @Get('global')
  async getGlobal(): Promise<VariableListItem[]> {
    return this.variablesService.getGlobal();
  }

  /**
   * GET /api/variables/definitions - Variablen-Definitionen aus Workflows
   */
  @Get('definitions')
  async getWorkflowDefinitions(): Promise<Array<{ workflowId: string; variables: any[] }>> {
    const scrapes = this.scrapeService.getScrapeDefinitions();
    const definitions: Array<{ workflowId: string; variables: any[] }> = [];

    for (const scrape of scrapes) {
      if (scrape.metadata?.variables && scrape.metadata.variables.length > 0) {
        definitions.push({
          workflowId: scrape.id,
          variables: scrape.metadata.variables
        });
      }
    }

    return definitions;
  }

  /**
   * GET /api/variables/workflow/:workflowId - Workflow-spezifische Variablen
   */
  @Get('workflow/:workflowId')
  async getByWorkflow(@Param('workflowId') workflowId: string): Promise<VariableListItem[]> {
    return this.variablesService.getByWorkflow(workflowId);
  }

  /**
   * GET /api/variables/:id - Variable nach ID
   */
  @Get(':id')
  async getById(@Param('id') id: string): Promise<Variable> {
    const variable = await this.variablesService.getById(id);
    if (!variable) {
      throw new HttpException('Variable not found', HttpStatus.NOT_FOUND);
    }
    return variable;
  }

  /**
   * POST /api/variables - Neue Variable erstellen
   */
  @Post()
  async create(@Body() data: CreateVariableDto): Promise<Variable> {
    try {
      return this.variablesService.create(data);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create variable';
      this.logger.error(`Failed to create variable: ${message}`);
      throw new HttpException(message, HttpStatus.BAD_REQUEST);
    }
  }

  /**
   * PUT /api/variables/:id - Variable aktualisieren
   */
  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() updates: UpdateVariableDto
  ): Promise<Variable> {
    try {
      return this.variablesService.update(id, updates);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update variable';
      this.logger.error(`Failed to update variable: ${message}`);
      throw new HttpException(message, HttpStatus.NOT_FOUND);
    }
  }

  /**
   * DELETE /api/variables/:id - Variable löschen
   */
  @Delete(':id')
  async delete(@Param('id') id: string): Promise<{ success: boolean }> {
    const success = await this.variablesService.delete(id);
    if (!success) {
      throw new HttpException('Variable not found', HttpStatus.NOT_FOUND);
    }
    return { success: true };
  }
}

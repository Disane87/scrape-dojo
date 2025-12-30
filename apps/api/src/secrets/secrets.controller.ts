import { Controller, Get, Post, Put, Delete, Body, Param, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiParam } from '@nestjs/swagger';
import { SecretsService, SecretListItem } from './secrets.service';
import { CreateSecretDto, UpdateSecretDto } from './dto';

@ApiTags('secrets')
@Controller('secrets')
export class SecretsController {
  private readonly logger = new Logger(SecretsController.name);

  constructor(private readonly secretsService: SecretsService) {}

  @Get()
  @ApiOperation({ summary: 'List all secrets (without actual values)' })
  @ApiResponse({ status: 200, description: 'List of secrets' })
  async listSecrets(): Promise<SecretListItem[]> {
    return this.secretsService.listSecrets();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a secret by ID (without actual value)' })
  @ApiParam({ name: 'id', description: 'Secret ID' })
  @ApiResponse({ status: 200, description: 'Secret details' })
  @ApiResponse({ status: 404, description: 'Secret not found' })
  async getSecret(@Param('id') id: string): Promise<SecretListItem> {
    const secret = await this.secretsService.getSecret(id);
    if (!secret) {
      throw new HttpException('Secret not found', HttpStatus.NOT_FOUND);
    }
    return secret;
  }

  @Post()
  @ApiOperation({ summary: 'Create a new secret' })
  @ApiBody({ type: CreateSecretDto })
  @ApiResponse({ status: 201, description: 'Secret created' })
  @ApiResponse({ status: 400, description: 'Invalid input or duplicate name' })
  async createSecret(@Body() body: CreateSecretDto): Promise<SecretListItem> {
    try {
      return await this.secretsService.createSecret(body.name, body.value, body.description);
    } catch (error) {
      throw new HttpException(
        error instanceof Error ? error.message : 'Failed to create secret',
        HttpStatus.BAD_REQUEST
      );
    }
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a secret' })
  @ApiParam({ name: 'id', description: 'Secret ID' })
  @ApiBody({ type: UpdateSecretDto })
  @ApiResponse({ status: 200, description: 'Secret updated' })
  @ApiResponse({ status: 404, description: 'Secret not found' })
  async updateSecret(@Param('id') id: string, @Body() body: UpdateSecretDto): Promise<SecretListItem> {
    try {
      const updated = await this.secretsService.updateSecret(id, body);
      if (!updated) {
        throw new HttpException('Secret not found', HttpStatus.NOT_FOUND);
      }
      return updated;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        error instanceof Error ? error.message : 'Failed to update secret',
        HttpStatus.BAD_REQUEST
      );
    }
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a secret' })
  @ApiParam({ name: 'id', description: 'Secret ID' })
  @ApiResponse({ status: 200, description: 'Secret deleted' })
  @ApiResponse({ status: 404, description: 'Secret not found' })
  async deleteSecret(@Param('id') id: string): Promise<{ success: boolean }> {
    const deleted = await this.secretsService.deleteSecret(id);
    if (!deleted) {
      throw new HttpException('Secret not found', HttpStatus.NOT_FOUND);
    }
    return { success: true };
  }

  @Post(':id/link/:workflowId')
  @ApiOperation({ summary: 'Link a secret to a workflow' })
  @ApiParam({ name: 'id', description: 'Secret ID' })
  @ApiParam({ name: 'workflowId', description: 'Workflow ID' })
  @ApiResponse({ status: 200, description: 'Secret linked to workflow' })
  async linkToWorkflow(
    @Param('id') id: string,
    @Param('workflowId') workflowId: string
  ): Promise<{ success: boolean }> {
    try {
      await this.secretsService.linkToWorkflow(id, workflowId);
      return { success: true };
    } catch (error) {
      throw new HttpException(
        error instanceof Error ? error.message : 'Failed to link secret',
        HttpStatus.BAD_REQUEST
      );
    }
  }

  @Delete(':id/link/:workflowId')
  @ApiOperation({ summary: 'Unlink a secret from a workflow' })
  @ApiParam({ name: 'id', description: 'Secret ID' })
  @ApiParam({ name: 'workflowId', description: 'Workflow ID' })
  @ApiResponse({ status: 200, description: 'Secret unlinked from workflow' })
  async unlinkFromWorkflow(
    @Param('id') id: string,
    @Param('workflowId') workflowId: string
  ): Promise<{ success: boolean }> {
    await this.secretsService.unlinkFromWorkflow(id, workflowId);
    return { success: true };
  }
}

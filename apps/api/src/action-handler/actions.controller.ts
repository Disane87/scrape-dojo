import { Controller, Get } from '@nestjs/common';
import { getAllActionMetadata } from './_decorators/action.decorator';
import { ActionMetadataMap } from './types/action-metadata.types';

@Controller('actions')
export class ActionsController {
  /**
   * Get metadata for all available actions
   * @returns Record of action name to metadata
   */
  @Get('metadata')
  getActionsMetadata(): ActionMetadataMap {
    return getAllActionMetadata();
  }
}

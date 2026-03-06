import { ApiProperty } from '@nestjs/swagger';
import {
  IsIn,
  IsOptional,
  IsString,
  MinLength,
  ValidateIf,
} from 'class-validator';
import type { VariableScope } from '../variables.service';

export class CreateVariableDto {
  @ApiProperty({ example: 'myVar' })
  @IsString()
  @MinLength(1)
  name!: string;

  @ApiProperty({ example: 'myValue' })
  @IsString()
  @MinLength(1)
  value!: string;

  @ApiProperty({ required: false, example: 'Description of the variable' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ enum: ['global', 'workflow'], example: 'global' })
  @IsIn(['global', 'workflow'])
  scope!: VariableScope;

  @ApiProperty({ required: false, example: 'amazon-orders' })
  @ValidateIf((o: CreateVariableDto) => o.scope === 'workflow')
  @IsString()
  @MinLength(1)
  workflowId?: string;
}

import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateVariableDto {
  @ApiProperty({ required: false, example: 'newValue' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  value?: string;

  @ApiProperty({ required: false, example: 'New description' })
  @IsOptional()
  @IsString()
  description?: string;
}

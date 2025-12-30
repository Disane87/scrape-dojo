import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateSecretDto {
  @ApiProperty({ required: false, example: 'mySecret' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @ApiProperty({ required: false, example: 'new-secret-value' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  value?: string;

  @ApiProperty({ required: false, example: 'Updated description' })
  @IsOptional()
  @IsString()
  description?: string;
}

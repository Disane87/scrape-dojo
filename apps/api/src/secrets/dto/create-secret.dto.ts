import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, MinLength } from 'class-validator';

export class CreateSecretDto {
  @ApiProperty({ example: 'mySecret' })
  @IsString()
  @MinLength(1)
  name!: string;

  @ApiProperty({ example: 'super-secret-value' })
  @IsString()
  @MinLength(1)
  value!: string;

  @ApiProperty({ required: false, example: 'Token for service X' })
  @IsOptional()
  @IsString()
  description?: string;
}

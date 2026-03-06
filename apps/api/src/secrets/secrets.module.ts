import { Module } from '@nestjs/common';
import { SecretsService } from './secrets.service';
import { SecretsController } from './secrets.controller';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  providers: [SecretsService],
  controllers: [SecretsController],
  exports: [SecretsService],
})
export class SecretsModule {}

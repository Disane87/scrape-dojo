import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VariablesService } from './variables.service';
import { VariablesController } from './variables.controller';
import { VariableEntity } from '../database/entities/variable.entity';
import { ScrapeModule } from '../scrape/scrape.module';
import { DatabaseModule } from '../database/database.module';
import { SecretsModule } from '../secrets/secrets.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([VariableEntity]),
    DatabaseModule,
    SecretsModule,
    ScrapeModule
  ],
  controllers: [VariablesController],
  providers: [VariablesService],
  exports: [VariablesService]
})
export class VariablesModule { }

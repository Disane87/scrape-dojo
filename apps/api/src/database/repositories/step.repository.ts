import { Injectable, Logger } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { RunStep, StepStatus } from '../entities';

@Injectable()
export class StepRepository {
  private readonly logger = new Logger(StepRepository.name);

  constructor(
    @InjectRepository(RunStep)
    private repository: Repository<RunStep>,
  ) {}

  async create(
    runId: string,
    name: string,
    stepOrder: number,
  ): Promise<RunStep> {
    const step = this.repository.create({
      runId,
      stepIndex: stepOrder,
      stepName: name,
      status: 'running',
      startTime: new Date(),
      endTime: null,
    });

    const savedStep = await this.repository.save(step);
    this.logger.debug(`📝 Created step: ${name} (order: ${stepOrder})`);
    return savedStep;
  }

  async updateStatus(stepId: number, status: StepStatus): Promise<void> {
    await this.repository.update(stepId, {
      status,
      endTime: status !== 'running' ? new Date() : undefined,
    });
    this.logger.debug(`📊 Updated step ${stepId} status: ${status}`);
  }

  async findById(stepId: number): Promise<RunStep | null> {
    return this.repository.findOne({
      where: { id: stepId },
      relations: ['actions'],
    });
  }

  async findByRunId(runId: string): Promise<RunStep[]> {
    return this.repository.find({
      where: { runId },
      order: { stepIndex: 'ASC' },
      relations: ['actions'],
    });
  }

  async deleteByRunId(runId: string): Promise<number> {
    const result = await this.repository.delete({ runId });
    return result.affected || 0;
  }
}

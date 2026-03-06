import { Injectable, Logger } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { RunAction, ActionStatus } from '../entities';

@Injectable()
export class ActionRepository {
  private readonly logger = new Logger(ActionRepository.name);

  constructor(
    @InjectRepository(RunAction)
    private repository: Repository<RunAction>,
  ) {}

  async create(
    stepId: number,
    name: string,
    actionType: string,
    actionOrder: number,
  ): Promise<RunAction> {
    const action = this.repository.create({
      stepId,
      actionIndex: actionOrder,
      actionName: name,
      actionType,
      status: 'running',
      startTime: new Date(),
      endTime: null,
      result: null,
      error: null,
    });

    const savedAction = await this.repository.save(action);
    this.logger.debug(`📝 Created action: ${name} (type: ${actionType})`);
    return savedAction;
  }

  async updateStatus(
    actionId: number,
    status: ActionStatus,
    error?: string,
    result?: unknown,
    loopData?: any,
  ): Promise<void> {
    const updateData: any = {
      status,
      endTime: status !== 'running' ? new Date() : undefined,
      error: error || null,
      result: result !== undefined ? JSON.stringify(result) : null,
    };

    if (loopData !== undefined) {
      updateData.loopData = JSON.stringify(loopData);
    }

    await this.repository.update(actionId, updateData);
    this.logger.debug(
      `📊 Updated action ${actionId} status: ${status}${loopData ? ' (with loop data)' : ''}`,
    );
  }

  async findById(actionId: number): Promise<RunAction | null> {
    return this.repository.findOne({
      where: { id: actionId },
    });
  }

  async findByStepId(stepId: number): Promise<RunAction[]> {
    return this.repository.find({
      where: { stepId },
      order: { actionIndex: 'ASC' },
    });
  }

  async deleteByStepId(stepId: number): Promise<number> {
    const result = await this.repository.delete({ stepId });
    return result.affected || 0;
  }
}

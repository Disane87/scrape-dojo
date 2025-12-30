import { Injectable, Logger } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Run, RunStatus, RunTrigger } from '../entities';

@Injectable()
export class RunRepository {
    private readonly logger = new Logger(RunRepository.name);

    constructor(
        @InjectRepository(Run)
        private repository: Repository<Run>
    ) {}

    async create(runId: string, scrapeId: string, trigger: RunTrigger = 'manual'): Promise<Run> {
        const run = this.repository.create({
            id: runId,
            scrapeId,
            status: 'running',
            trigger,
            startTime: new Date(),
            endTime: null,
            error: null
        });

        const savedRun = await this.repository.save(run);
        this.logger.debug(`📝 Created run: ${runId} (trigger: ${trigger})`);
        return savedRun;
    }

    async updateStatus(runId: string, status: RunStatus, error?: string): Promise<void> {
        await this.repository.update(runId, {
            status,
            endTime: status !== 'running' ? new Date() : undefined,
            error: error || null
        });
        this.logger.debug(`📊 Updated run ${runId} status: ${status}`);
    }

    async findById(runId: string): Promise<Run | null> {
        return this.repository.findOne({
            where: { id: runId },
            relations: ['steps', 'steps.actions']
        });
    }

    async findRecent(limit = 50): Promise<Run[]> {
        return this.repository.find({
            relations: ['steps', 'steps.actions'],
            order: { startTime: 'DESC' },
            take: limit
        });
    }

    async findByScrapeId(scrapeId: string, limit = 50): Promise<Run[]> {
        return this.repository.find({
            where: { scrapeId },
            relations: ['steps', 'steps.actions'],
            order: { startTime: 'DESC' },
            take: limit
        });
    }

    async findLastRunForEachScrape(): Promise<Map<string, { status: RunStatus; startTime: Date; endTime?: Date }>> {
        const result = new Map<string, { status: RunStatus; startTime: Date; endTime?: Date }>();

        const scrapeIds = await this.repository
            .createQueryBuilder('run')
            .select('DISTINCT run.scrapeId', 'scrapeId')
            .getRawMany();

        for (const { scrapeId } of scrapeIds) {
            const lastRun = await this.repository.findOne({
                where: { scrapeId },
                order: { startTime: 'DESC' }
            });

            if (lastRun) {
                result.set(scrapeId, {
                    status: lastRun.status,
                    startTime: lastRun.startTime,
                    endTime: lastRun.endTime
                });
            }
        }

        return result;
    }

    async deleteOlderThan(days: number): Promise<number> {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);

        const result = await this.repository
            .createQueryBuilder()
            .delete()
            .where('startTime < :cutoffDate', { cutoffDate })
            .execute();

        return result.affected || 0;
    }

    async countByScrapeId(scrapeId: string): Promise<number> {
        return this.repository.count({ where: { scrapeId } });
    }
}

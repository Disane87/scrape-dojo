import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Repository, DataSource, LessThan, IsNull } from 'typeorm';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Run, RunStep, RunAction, RunLog, ScrapeData, ScrapeSchedule, SecretEntity } from './entities';
import { RunStatus, RunTrigger, StepStatus, ActionStatus, LogLevel } from './entities';

// Interface für API-Response
export interface RunHistoryDTO {
    id: string;
    scrapeId: string;
    status: string;
    trigger: string;
    startTime: number;
    endTime?: number;
    error?: string;
    steps: {
        name: string;
        status: string;
        startTime?: number;
        endTime?: number;
        actions: {
            name: string;
            actionType: string;
            status: string;
            startTime?: number;
            endTime?: number;
            result?: unknown;
            error?: string;
        }[];
    }[];
}

// Interface für ScrapeData API-Response
export interface ScrapeDataDTO {
    id: number;
    scrapeId: string;
    runId: string | null;
    key: string;
    value: string;
    createdAt: number;
    updatedAt: number;
}

@Injectable()
export class DatabaseService implements OnModuleInit {
    private readonly logger = new Logger(DatabaseService.name);

    constructor(
        @InjectDataSource()
        public dataSource: DataSource,

        @InjectRepository(Run)
        private runRepository: Repository<Run>,

        @InjectRepository(RunStep)
        private stepRepository: Repository<RunStep>,

        @InjectRepository(RunAction)
        private actionRepository: Repository<RunAction>,

        @InjectRepository(RunLog)
        private logRepository: Repository<RunLog>,

        @InjectRepository(ScrapeData)
        private scrapeDataRepository: Repository<ScrapeData>,

        @InjectRepository(ScrapeSchedule)
        private scheduleRepository: Repository<ScrapeSchedule>,

        @InjectRepository(SecretEntity)
        private secretRepository: Repository<SecretEntity>,
    ) { }

    async onModuleInit() {
        this.logger.log('🗃️ Database service initialized');
    }

    // Run Management
    async createRun(runId: string, scrapeId: string, trigger: RunTrigger = 'manual'): Promise<Run> {
        const run = this.runRepository.create({
            id: runId,
            scrapeId,
            status: 'running',
            trigger,
            startTime: new Date(),
            endTime: null,
            error: null
        });

        const savedRun = await this.runRepository.save(run);
        this.logger.debug(`📝 Created run: ${runId} (trigger: ${trigger})`);
        return savedRun;
    }

    async updateRunStatus(runId: string, status: RunStatus, error?: string): Promise<void> {
        await this.runRepository.update(runId, {
            status,
            endTime: status !== 'running' ? new Date() : undefined,
            error: error || null
        });
        this.logger.debug(`📊 Updated run ${runId} status: ${status}`);
    }

    async getRun(runId: string): Promise<Run | null> {
        return this.runRepository.findOne({
            where: { id: runId },
            relations: ['steps', 'steps.actions']
        });
    }

    async getRecentRuns(limit = 50): Promise<Run[]> {
        return this.runRepository.find({
            order: { startTime: 'DESC' },
            take: limit,
            relations: ['steps', 'steps.actions']
        });
    }

    async getRunsByScrapeId(scrapeId: string, limit = 50): Promise<Run[]> {
        return this.runRepository.find({
            where: { scrapeId },
            order: { startTime: 'DESC' },
            take: limit,
            relations: ['steps', 'steps.actions']
        });
    }

    /**
     * Get the last run for each scrape ID
     * Returns a map of scrapeId -> last run info
     */
    async getLastRunForEachScrape(): Promise<Map<string, { status: RunStatus; startTime: Date; endTime?: Date }>> {
        const result = new Map<string, { status: RunStatus; startTime: Date; endTime?: Date }>();

        // Get all unique scrape IDs first
        const scrapeIds = await this.runRepository
            .createQueryBuilder('run')
            .select('DISTINCT run.scrapeId', 'scrapeId')
            .getRawMany();

        // For each scrape ID, get the most recent run
        for (const { scrapeId } of scrapeIds) {
            const lastRun = await this.runRepository.findOne({
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

    // Convert DB entity to DTO for API
    toRunHistoryDTO(run: Run): RunHistoryDTO {
        return {
            id: run.id,
            scrapeId: run.scrapeId,
            status: run.status,
            trigger: run.trigger || 'manual',
            startTime: run.startTime?.getTime() || Date.now(),
            endTime: run.endTime?.getTime(),
            error: run.error || undefined,
            steps: (run.steps || [])
                .sort((a, b) => a.stepIndex - b.stepIndex)
                .map(step => ({
                    name: step.stepName,
                    status: step.status,
                    startTime: step.startTime?.getTime(),
                    endTime: step.endTime?.getTime(),
                    actions: (step.actions || [])
                        .sort((a, b) => a.actionIndex - b.actionIndex)
                        .map(action => ({
                            name: action.actionName,
                            actionType: action.actionType,
                            status: action.status,
                            startTime: action.startTime?.getTime(),
                            endTime: action.endTime?.getTime(),
                            result: action.result ? this.parseResult(action.result) : undefined,
                            error: action.error || undefined,
                        }))
                }))
        };
    }


    private parseResult(result: string): unknown {
        try {
            return JSON.parse(result);
        } catch {
            return result;
        }
    }

    private serializeResult(result: unknown): string | null {
        if (result === undefined || result === null) return null;
        try {
            return JSON.stringify(result);
        } catch {
            return String(result);
        }
    }

    // Step Management
    async createStep(runId: string, stepName: string, stepIndex: number): Promise<RunStep> {
        const step = this.stepRepository.create({
            runId,
            stepIndex,
            stepName,
            status: 'running',
            startTime: new Date(),
            endTime: null
        });

        return await this.stepRepository.save(step);
    }

    async updateStepStatus(stepId: number, status: StepStatus): Promise<void> {
        const updateData: Partial<RunStep> = { status };

        if (status === 'completed' || status === 'error' || status === 'skipped') {
            updateData.endTime = new Date();
        }

        await this.stepRepository.update(stepId, updateData);
        this.logger.debug(`📈 Updated step ${stepId}: ${status}`);
    }

    // Action Management
    async createAction(
        stepId: number,
        actionName: string,
        actionType: string,
        actionIndex: number
    ): Promise<RunAction> {
        const action = this.actionRepository.create({
            stepId,
            actionIndex,
            actionName,
            actionType,
            status: 'running',
            startTime: new Date(),
            endTime: null,
            error: null,
            result: null
        });

        return await this.actionRepository.save(action);
    }

    async updateActionStatus(
        actionId: number,
        status: ActionStatus,
        error?: string,
        result?: unknown
    ): Promise<void> {
        const updateData: Partial<RunAction> = {
            status,
            error: error || null,
            result: this.serializeResult(result)
        };

        if (status === 'completed' || status === 'error' || status === 'skipped') {
            updateData.endTime = new Date();
        }

        await this.actionRepository.update(actionId, updateData);
        this.logger.debug(`🔧 Updated action ${actionId}: ${status}`);
    }

    // Cleanup
    async clearOldData(olderThanDays = 30): Promise<void> {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

        const result = await this.runRepository.delete({
            startTime: LessThan(cutoffDate)
        });

        this.logger.log(`🧹 Cleaned up ${result.affected} old runs older than ${olderThanDays} days`);
    }

    async deleteRun(runId: string): Promise<void> {
        await this.runRepository.delete(runId);
        this.logger.debug(`🗑️ Deleted run: ${runId}`);
    }

    async deleteRunsByScrapeId(scrapeId: string): Promise<number> {
        const result = await this.runRepository.delete({ scrapeId });
        this.logger.log(`🗑️ Deleted ${result.affected} runs for scrape: ${scrapeId}`);
        return result.affected || 0;
    }

    // ============ ScrapeData Management ============

    /**
     * Store data for a scrape (Job-Level: runId = null, Run-Level: runId set)
     */
    async storeData(scrapeId: string, key: string, value: string, runId?: string): Promise<ScrapeData> {
        // Suche existierenden Eintrag
        const existing = await this.scrapeDataRepository.findOne({
            where: {
                scrapeId,
                key,
                runId: runId ?? IsNull()
            }
        });

        if (existing) {
            // Update bestehenden Eintrag
            existing.value = value;
            const saved = await this.scrapeDataRepository.save(existing);
            this.logger.debug(`💾 Updated scrape data: ${scrapeId}.${key} = ${value.substring(0, 50)}...`);
            return saved;
        } else {
            // Neuer Eintrag
            const data = this.scrapeDataRepository.create({
                scrapeId,
                runId: runId ?? null,
                key,
                value
            });
            const saved = await this.scrapeDataRepository.save(data);
            this.logger.debug(`💾 Stored new scrape data: ${scrapeId}.${key} = ${value.substring(0, 50)}...`);
            return saved;
        }
    }

    /**
     * Get Job-Level data (persistent across runs)
     */
    async getJobData(scrapeId: string, key?: string): Promise<ScrapeData[]> {
        const where: any = { scrapeId, runId: IsNull() };
        if (key) where.key = key;
        return this.scrapeDataRepository.find({ where });
    }

    /**
     * Get a single Job-Level value
     */
    async getJobDataValue(scrapeId: string, key: string): Promise<string | null> {
        const data = await this.scrapeDataRepository.findOne({
            where: { scrapeId, key, runId: IsNull() }
        });
        return data?.value ?? null;
    }

    /**
     * Get all stored data for a specific run
     */
    async getRunData(runId: string): Promise<ScrapeData[]> {
        return this.scrapeDataRepository.find({
            where: { runId },
            order: { createdAt: 'ASC' }
        });
    }

    /**
     * Get all stored data for a scrape (both Job-Level and Run-Level)
     */
    async getAllScrapeData(scrapeId: string): Promise<{ jobLevel: ScrapeData[]; runs: Record<string, ScrapeData[]> }> {
        const allData = await this.scrapeDataRepository.find({
            where: { scrapeId },
            order: { createdAt: 'ASC' }
        });

        const jobLevel = allData.filter(d => d.runId === null);
        const runData = allData.filter(d => d.runId !== null);

        const runs: Record<string, ScrapeData[]> = {};
        for (const data of runData) {
            if (!runs[data.runId!]) runs[data.runId!] = [];
            runs[data.runId!].push(data);
        }

        return { jobLevel, runs };
    }

    /**
     * Delete all data for a specific run
     */
    async deleteRunData(runId: string): Promise<number> {
        const result = await this.scrapeDataRepository.delete({ runId });
        return result.affected || 0;
    }

    /**
     * Convert ScrapeData to DTO
     */
    toScrapeDataDTO(data: ScrapeData): ScrapeDataDTO {
        return {
            id: data.id,
            scrapeId: data.scrapeId,
            runId: data.runId,
            key: data.key,
            value: data.value,
            createdAt: data.createdAt?.getTime() || Date.now(),
            updatedAt: data.updatedAt?.getTime() || Date.now()
        };
    }

    // ============ Schedule Management ============

    /**
     * Get schedule for a scrape (creates default if not exists)
     */
    async getSchedule(scrapeId: string): Promise<ScrapeSchedule> {
        this.logger.debug(`📅 Getting schedule for: ${scrapeId}`);
        let schedule = await this.scheduleRepository.findOne({ where: { scrapeId } });

        if (!schedule) {
            this.logger.debug(`📅 No schedule found, creating default for: ${scrapeId}`);
            // Erstelle Default-Schedule (nur manuell, kein Cron)
            schedule = this.scheduleRepository.create({
                scrapeId,
                manualEnabled: true,
                scheduleEnabled: false,
                cronExpression: null,
                timezone: 'Europe/Berlin',
            });
            schedule = await this.scheduleRepository.save(schedule);
        } else {
            this.logger.debug(`📅 Found schedule for ${scrapeId}: scheduleEnabled=${schedule.scheduleEnabled}, cron=${schedule.cronExpression}`);
        }

        return schedule;
    }

    /**
     * Get all schedules
     */
    async getAllSchedules(): Promise<ScrapeSchedule[]> {
        return this.scheduleRepository.find();
    }

    /**
     * Get all enabled schedules (for scheduler service)
     */
    async getEnabledSchedules(): Promise<ScrapeSchedule[]> {
        return this.scheduleRepository.find({
            where: { scheduleEnabled: true }
        });
    }

    /**
     * Update schedule for a scrape
     */
    async updateSchedule(
        scrapeId: string,
        updates: Partial<Pick<ScrapeSchedule, 'manualEnabled' | 'scheduleEnabled' | 'cronExpression' | 'timezone'>>
    ): Promise<ScrapeSchedule> {
        let schedule = await this.getSchedule(scrapeId);

        if (updates.manualEnabled !== undefined) {
            schedule.manualEnabled = updates.manualEnabled;
        }
        if (updates.scheduleEnabled !== undefined) {
            schedule.scheduleEnabled = updates.scheduleEnabled;
        }
        if (updates.cronExpression !== undefined) {
            schedule.cronExpression = updates.cronExpression;
        }
        if (updates.timezone !== undefined) {
            schedule.timezone = updates.timezone;
        }

        return this.scheduleRepository.save(schedule);
    }

    /**
     * Update last scheduled run time
     */
    async updateLastScheduledRun(scrapeId: string): Promise<void> {
        await this.scheduleRepository.update(
            { scrapeId },
            { lastScheduledRun: new Date() }
        );
    }

    /**
     * Update next scheduled run time
     */
    async updateNextScheduledRun(scrapeId: string, nextRun: Date | null): Promise<void> {
        await this.scheduleRepository.update(
            { scrapeId },
            { nextScheduledRun: nextRun }
        );
    }

    /**
     * Convert ScrapeSchedule to DTO
     */
    toScheduleDTO(schedule: ScrapeSchedule) {
        return {
            scrapeId: schedule.scrapeId,
            manualEnabled: schedule.manualEnabled,
            scheduleEnabled: schedule.scheduleEnabled,
            cronExpression: schedule.cronExpression,
            timezone: schedule.timezone,
            lastScheduledRun: schedule.lastScheduledRun?.getTime() || null,
            nextScheduledRun: schedule.nextScheduledRun?.getTime() || null,
        };
    }

    // ===========================
    // Secrets Management
    // ===========================

    /**
     * Create a new secret
     */
    async createSecret(id: string, name: string, encryptedValue: string, description?: string): Promise<SecretEntity> {
        const secret = this.secretRepository.create({
            id,
            name,
            encryptedValue,
            description,
            createdAt: Date.now(),
            updatedAt: Date.now()
        });
        const saved = await this.secretRepository.save(secret);
        this.logger.debug(`🔐 Created secret: ${name} (${id})`);
        return saved;
    }

    /**
     * Get all secrets
     */
    async getAllSecrets(): Promise<SecretEntity[]> {
        return this.secretRepository.find({
            order: { createdAt: 'DESC' }
        });
    }

    /**
     * Get secret by ID
     */
    async getSecretById(id: string): Promise<SecretEntity | null> {
        return this.secretRepository.findOne({ where: { id } });
    }

    /**
     * Get secret by name
     */
    async getSecretByName(name: string): Promise<SecretEntity | null> {
        return this.secretRepository.findOne({ where: { name } });
    }

    /**
     * Update secret value
     */
    async updateSecret(id: string, updates: { name?: string; encryptedValue?: string; description?: string }): Promise<SecretEntity | null> {
        const secret = await this.secretRepository.findOne({ where: { id } });
        if (!secret) {
            return null;
        }

        if (updates.name !== undefined) {
            secret.name = updates.name;
        }
        if (updates.encryptedValue !== undefined) {
            secret.encryptedValue = updates.encryptedValue;
        }
        if (updates.description !== undefined) {
            secret.description = updates.description;
        }

        secret.updatedAt = Date.now();
        const saved = await this.secretRepository.save(secret);
        this.logger.debug(`🔐 Updated secret: ${secret.name} (${id})`);
        return saved;
    }

    /**
     * Delete secret by ID
     */
    async deleteSecret(id: string): Promise<boolean> {
        const result = await this.secretRepository.delete(id);
        if (result.affected && result.affected > 0) {
            this.logger.debug(`🗑️ Deleted secret: ${id}`);
            return true;
        }
        return false;
    }
}
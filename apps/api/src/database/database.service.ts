import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Repository, DataSource, IsNull, LessThan } from 'typeorm';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { RunLog, ScrapeSchedule, SecretEntity, ScrapeData } from './entities';
import { RunStatus, RunTrigger, StepStatus, ActionStatus, LogLevel } from './entities';
import { RunRepository, StepRepository, ActionRepository, ScrapeDataRepository } from './repositories';

// Interface für API-Response
export interface RunHistoryDTO {
    id: string;
    scrapeId: string;
    status: string;
    trigger: string;
    startTime: number;
    endTime?: number;
    error?: string;
    debugData?: Record<string, any>;
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

        // New Repository Pattern
        private readonly runRepo: RunRepository,
        private readonly stepRepo: StepRepository,
        private readonly actionRepo: ActionRepository,
        private readonly dataRepo: ScrapeDataRepository,

        // Remaining TypeORM repositories
        @InjectRepository(RunLog)
        private logRepository: Repository<RunLog>,

        @InjectRepository(ScrapeSchedule)
        private scheduleRepository: Repository<ScrapeSchedule>,

        @InjectRepository(SecretEntity)
        private secretRepository: Repository<SecretEntity>,
    ) {}

    async onModuleInit() {
        this.logger.log('🗃️ Database service initialized');
    }

    // ==================== Run Management ====================
    async createRun(runId: string, scrapeId: string, trigger: RunTrigger = 'manual') {
        return this.runRepo.create(runId, scrapeId, trigger);
    }

    async updateRunStatus(runId: string, status: RunStatus, error?: string) {
        return this.runRepo.updateStatus(runId, status, error);
    }

    async getRun(runId: string) {
        return this.runRepo.findById(runId);
    }

    async getRecentRuns(limit = 50) {
        return this.runRepo.findRecent(limit);
    }

    async getRunsByScrapeId(scrapeId: string, limit = 50) {
        return this.runRepo.findByScrapeId(scrapeId, limit);
    }

    async getLastRunForEachScrape() {
        return this.runRepo.findLastRunForEachScrape();
    }

    async deleteOldRuns(days: number) {
        return this.runRepo.deleteOlderThan(days);
    }

    // ==================== Step Management ====================
    async createStep(runId: string, name: string, stepOrder: number) {
        return this.stepRepo.create(runId, name, stepOrder);
    }

    async updateStepStatus(stepId: number, status: StepStatus) {
        return this.stepRepo.updateStatus(stepId, status);
    }

    async getStepsByRunId(runId: string) {
        return this.stepRepo.findByRunId(runId);
    }

    // ==================== Action Management ====================
    async createAction(stepId: number, name: string, actionType: string, actionOrder: number) {
        return this.actionRepo.create(stepId, name, actionType, actionOrder);
    }

    async updateActionStatus(actionId: number, status: ActionStatus, error?: string, result?: unknown, loopData?: any) {
        return this.actionRepo.updateStatus(actionId, status, error, result, loopData);
    }

    async getActionsByStepId(stepId: number) {
        return this.actionRepo.findByStepId(stepId);
    }

    // ==================== Data Management ====================
    async upsertJobData(scrapeId: string, key: string, value: string) {
        return this.dataRepo.upsertJobData(scrapeId, key, value);
    }

    async saveRunData(scrapeId: string, runId: string, key: string, value: string) {
        return this.dataRepo.saveRunData(scrapeId, runId, key, value);
    }

    async getJobData(scrapeId: string) {
        return this.dataRepo.getJobData(scrapeId);
    }

    async getRunData(scrapeId: string, runId: string) {
        return this.dataRepo.getRunData(scrapeId, runId);
    }

    async getScrapeDataValue(scrapeId: string, key: string, runId?: string) {
        return this.dataRepo.getValue(scrapeId, key, runId);
    }

    // ==================== History & Analytics ====================
    async getRunHistory(limit = 50, scrapeId?: string): Promise<RunHistoryDTO[]> {
        const runs = scrapeId
            ? await this.runRepo.findByScrapeId(scrapeId, limit)
            : await this.runRepo.findRecent(limit);

        return runs.map(run => ({
            id: run.id,
            scrapeId: run.scrapeId,
            status: run.status,
            trigger: run.trigger,
            startTime: run.startTime.getTime(),
            endTime: run.endTime?.getTime(),
            error: run.error,
            steps: [] // Don't load steps for list view - only load them when viewing a specific run
        }));
    }

    // ==================== Logging ====================
    async saveLog(
        runId: string,
        level: LogLevel,
        message: string,
        context?: string,
        stepName?: string,
        actionName?: string
    ): Promise<void> {
        // Note: RunLog entity doesn't have stepName/actionName fields
        // They are not stored in the current schema
        const log = this.logRepository.create({
            runId,
            level,
            message,
            context: context || 'System',
            timestamp: new Date()
        });
        await this.logRepository.save(log);
    }

    async getLogsByRunId(runId: string): Promise<RunLog[]> {
        return this.logRepository.find({
            where: { runId },
            order: { timestamp: 'ASC' }
        });
    }

    // ==================== Schedules ====================
    async upsertSchedule(scrapeId: string, cronExpression: string, enabled: boolean) {
        const existing = await this.scheduleRepository.findOne({ where: { scrapeId } });

        if (existing) {
            await this.scheduleRepository.update({ scrapeId }, {
                cronExpression,
                scheduleEnabled: enabled,
                updatedAt: new Date()
            });
            this.logger.debug(`🔄 Updated schedule for ${scrapeId}`);
        } else {
            const schedule = this.scheduleRepository.create({
                scrapeId,
                cronExpression,
                scheduleEnabled: enabled
            });
            await this.scheduleRepository.save(schedule);
            this.logger.debug(`📝 Created schedule for ${scrapeId}`);
        }
    }

    async getSchedule(scrapeId: string) {
        return this.scheduleRepository.findOne({ where: { scrapeId } });
    }

    async getAllSchedules() {
        return this.scheduleRepository.find({ where: { scheduleEnabled: true } });
    }

    async deleteSchedule(scrapeId: string) {
        await this.scheduleRepository.delete({ scrapeId });
    }

    async updateScheduleLastRun(scrapeId: string) {
        await this.scheduleRepository.update({ scrapeId }, {
            lastScheduledRun: new Date()
        });
    }

    // ==================== Additional Methods from Old Service ====================

    private serializeResult(result: unknown): string | null {
        if (result === undefined || result === null) return null;
        try {
            return JSON.stringify(result);
        } catch {
            return String(result);
        }
    }

    async clearOldData(olderThanDays = 30): Promise<void> {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);
        
        await this.runRepo.deleteOlderThan(olderThanDays);
        this.logger.log(`🧹 Cleaned up old runs older than ${olderThanDays} days`);
    }

    async deleteRun(runId: string): Promise<void> {
        // RunRepository doesn't have direct delete, use DataSource
        await this.dataSource.getRepository('Run').delete(runId);
        this.logger.debug(`🗑️ Deleted run: ${runId}`);
    }

    async deleteRunsByScrapeId(scrapeId: string): Promise<number> {
        const result = await this.dataSource.getRepository('Run').delete({ scrapeId });
        this.logger.log(`🗑️ Deleted ${result.affected} runs for scrape: ${scrapeId}`);
        return result.affected || 0;
    }

    // ==================== ScrapeData Management ====================

    /**
     * Store data for a scrape (Job-Level: runId = null, Run-Level: runId set)
     */
    async storeData(scrapeId: string, key: string, value: string, runId?: string): Promise<ScrapeData> {
        const scrapeDataRepo = this.dataSource.getRepository(ScrapeData);
        
        // Suche existierenden Eintrag
        const existing = await scrapeDataRepo.findOne({
            where: {
                scrapeId,
                key,
                runId: runId ?? IsNull()
            }
        });

        if (existing) {
            // Update bestehenden Eintrag
            existing.value = value;
            const saved = await scrapeDataRepo.save(existing);
            this.logger.debug(`💾 Updated scrape data: ${scrapeId}.${key} = ${value.substring(0, 50)}...`);
            return saved;
        } else {
            // Neuer Eintrag
            const data = scrapeDataRepo.create({
                scrapeId,
                runId: runId ?? null,
                key,
                value
            });
            const saved = await scrapeDataRepo.save(data);
            this.logger.debug(`💾 Stored new scrape data: ${scrapeId}.${key} = ${value.substring(0, 50)}...`);
            return saved;
        }
    }

    /**
     * Get Job-Level data (persistent across runs)
     */
    async getJobDataByKey(scrapeId: string, key?: string): Promise<ScrapeData[]> {
        const scrapeDataRepo = this.dataSource.getRepository(ScrapeData);
        const where: any = { scrapeId, runId: IsNull() };
        if (key) where.key = key;
        return scrapeDataRepo.find({ where });
    }

    /**
     * Get a single Job-Level value
     */
    async getJobDataValue(scrapeId: string, key: string): Promise<string | null> {
        const scrapeDataRepo = this.dataSource.getRepository(ScrapeData);
        const data = await scrapeDataRepo.findOne({
            where: { scrapeId, key, runId: IsNull() }
        });
        return data?.value ?? null;
    }

    /**
     * Get all stored data for a specific run
     */
    async getRunDataByRunId(runId: string): Promise<ScrapeData[]> {
        const scrapeDataRepo = this.dataSource.getRepository(ScrapeData);
        return scrapeDataRepo.find({
            where: { runId },
            order: { createdAt: 'ASC' }
        });
    }

    /**
     * Get all stored data for a scrape (both Job-Level and Run-Level)
     */
    async getAllScrapeData(scrapeId: string): Promise<{ jobLevel: ScrapeData[]; runs: Record<string, ScrapeData[]> }> {
        const scrapeDataRepo = this.dataSource.getRepository(ScrapeData);
        const allData = await scrapeDataRepo.find({
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
        const scrapeDataRepo = this.dataSource.getRepository(ScrapeData);
        const result = await scrapeDataRepo.delete({ runId });
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

    // ==================== Schedule Management (Extended) ====================

    /**
     * Get schedule for a scrape (creates default if not exists)
     */
    async getOrCreateSchedule(scrapeId: string): Promise<ScrapeSchedule> {
        this.logger.debug(`📅 Getting schedule for: ${scrapeId}`);
        let schedule = await this.scheduleRepository.findOne({ where: { scrapeId } });

        if (!schedule) {
            this.logger.debug(`📅 No schedule found, creating default for: ${scrapeId}`);
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
    async updateScheduleConfig(
        scrapeId: string,
        updates: Partial<Pick<ScrapeSchedule, 'manualEnabled' | 'scheduleEnabled' | 'cronExpression' | 'timezone'>>
    ): Promise<ScrapeSchedule> {
        let schedule = await this.getOrCreateSchedule(scrapeId);

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
    toScheduleDTO(schedule: ScrapeSchedule | null) {
        if (!schedule) {
            return null;
        }
        
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

    // ==================== Secrets Management ====================

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

    /**
     * Convert Run to DTO
     */
    toRunHistoryDTO(run: any): RunHistoryDTO {
        if (!run) {
            throw new Error('Cannot convert null run to DTO');
        }
        
        // Map database status to frontend status
        const mapStatus = (status: string): string => {
            if (status === 'completed') return 'success';
            if (status === 'error') return 'failed';
            return status;
        };
        
        // Recursively map status in child actions (for loop iterations)
        const mapChildActionsStatus = (childActions: any[]): any[] => {
            if (!childActions) return childActions;
            return childActions.map((childAction: any) => {
                const mapped: any = {
                    ...childAction,
                    status: childAction.status ? mapStatus(childAction.status) : childAction.status,
                    // Recursively process nested child actions
                    childActions: childAction.childActions ? mapChildActionsStatus(childAction.childActions) : childAction.childActions
                };
                
                // Process nested loop iterations (for loops inside loops)
                if (childAction.loopIterations && Array.isArray(childAction.loopIterations)) {
                    mapped.loopIterations = childAction.loopIterations.map((iteration: any) => ({
                        ...iteration,
                        childActions: mapChildActionsStatus(iteration.childActions)
                    }));
                }
                
                return mapped;
            });
        };
        
        return {
            id: run.id,
            scrapeId: run.scrapeId || null,
            status: mapStatus(run.status),
            trigger: run.trigger,
            startTime: run.startTime?.getTime() || Date.now(),
            endTime: run.endTime?.getTime(),
            error: run.error,
            steps: (run.steps || []).map((step: any) => ({
                name: step.stepName,
                status: mapStatus(step.status),
                startTime: step.startTime?.getTime(),
                endTime: step.endTime?.getTime(),
                actions: (step.actions || []).map((action: any) => {
                    const actionDto: any = {
                        name: action.actionName,
                        actionType: action.actionType,
                        status: mapStatus(action.status),
                        startTime: action.startTime?.getTime(),
                        endTime: action.endTime?.getTime(),
                        result: action.result ? JSON.parse(action.result) : undefined,
                        error: action.error
                    };
                    
                    // Add loop data if available
                    if (action.loopData) {
                        try {
                            this.logger.debug(`🔍 Parsing loopData for action ${action.actionName}: ${action.loopData.substring(0, 200)}...`);
                            let loopData = JSON.parse(action.loopData);
                            
                            // Handle double-stringified JSON (legacy data)
                            if (typeof loopData === 'string') {
                                this.logger.debug(`🔄 Detected double-stringified loopData, parsing again...`);
                                loopData = JSON.parse(loopData);
                            }
                            
                            this.logger.debug(`✅ Parsed loopData:`, { iterations: loopData.iterations?.length, total: loopData.total, current: loopData.current });
                            actionDto.loopIterations = loopData.iterations;
                            actionDto.loopTotal = loopData.total;
                            actionDto.loopCurrent = loopData.current;
                            
                            // Map status in child actions of iterations
                            if (actionDto.loopIterations && Array.isArray(actionDto.loopIterations)) {
                                actionDto.loopIterations = actionDto.loopIterations.map((iteration: any) => ({
                                    ...iteration,
                                    childActions: mapChildActionsStatus(iteration.childActions)
                                }));
                                this.logger.debug(`🔄 Mapped ${actionDto.loopIterations.length} iterations with childActions`);
                            }
                        } catch (error) {
                            this.logger.warn(`Failed to parse loop data for action ${action.actionName}: ${error.message}`);
                        }
                    } else if (action.actionType === 'loop') {
                        this.logger.warn(`⚠️ Loop action ${action.actionName} has no loopData!`);
                    }
                    
                    return actionDto;
                })
            }))
        };
    }
}

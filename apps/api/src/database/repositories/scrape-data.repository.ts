import { Injectable, Logger } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { ScrapeData } from '../entities';

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
export class ScrapeDataRepository {
    private readonly logger = new Logger(ScrapeDataRepository.name);

    constructor(
        @InjectRepository(ScrapeData)
        private repository: Repository<ScrapeData>
    ) {}

    /**
     * Speichert oder aktualisiert Job-Level Daten (runId = null)
     */
    async upsertJobData(scrapeId: string, key: string, value: string): Promise<void> {
        const existing = await this.repository.findOne({
            where: { scrapeId, key, runId: null as any }
        });

        if (existing) {
            await this.repository.update(existing.id, { value, updatedAt: new Date() });
            this.logger.debug(`🔄 Updated job data: ${scrapeId}.${key}`);
        } else {
            const data = this.repository.create({
                scrapeId,
                runId: null,
                key,
                value
            });
            await this.repository.save(data);
            this.logger.debug(`📝 Created job data: ${scrapeId}.${key}`);
        }
    }

    /**
     * Speichert Run-spezifische Daten
     */
    async saveRunData(scrapeId: string, runId: string, key: string, value: string): Promise<void> {
        const data = this.repository.create({
            scrapeId,
            runId,
            key,
            value
        });
        await this.repository.save(data);
        this.logger.debug(`📝 Created run data: ${scrapeId}.${runId}.${key}`);
    }

    /**
     * Lädt alle Job-Level Daten für einen Scrape
     */
    async getJobData(scrapeId: string): Promise<ScrapeData[]> {
        return this.repository.find({
            where: { scrapeId, runId: null as any },
            order: { key: 'ASC' }
        });
    }

    /**
     * Lädt alle Run-spezifischen Daten
     */
    async getRunData(scrapeId: string, runId: string): Promise<ScrapeData[]> {
        return this.repository.find({
            where: { scrapeId, runId },
            order: { key: 'ASC' }
        });
    }

    /**
     * Lädt einen spezifischen Datenwert
     */
    async getValue(scrapeId: string, key: string, runId?: string): Promise<string | null> {
        const data = await this.repository.findOne({
            where: { scrapeId, key, runId: runId || (null as any) }
        });
        return data?.value || null;
    }

    /**
     * Löscht Job-Level Daten
     */
    async deleteJobData(scrapeId: string, key?: string): Promise<number> {
        const whereClause: any = { scrapeId, runId: null };
        if (key) {
            whereClause.key = key;
        }
        
        const result = await this.repository.delete(whereClause);
        return result.affected || 0;
    }

    /**
     * Löscht Run-spezifische Daten
     */
    async deleteRunData(runId: string): Promise<number> {
        const result = await this.repository.delete({ runId });
        return result.affected || 0;
    }

    /**
     * Konvertiert zu DTO
     */
    toDTO(data: ScrapeData): ScrapeDataDTO {
        return {
            id: data.id,
            scrapeId: data.scrapeId,
            runId: data.runId,
            key: data.key,
            value: data.value,
            createdAt: data.createdAt.getTime(),
            updatedAt: data.updatedAt.getTime()
        };
    }
}

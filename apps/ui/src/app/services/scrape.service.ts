import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  ScrapeListItem,
  ScrapeRunResponse,
  Scrape,
  ScrapeEvent,
  RunHistoryItem,
  ScrapeSchedule,
} from '@scrape-dojo/shared';

@Injectable({
  providedIn: 'root',
})
export class ScrapeService {
  private http = inject(HttpClient);
  private readonly apiUrl = '/api';

  getScrapes(): Observable<ScrapeListItem[]> {
    return this.http.get<ScrapeListItem[]>(`${this.apiUrl}/scrapes`);
  }

  getScrapeDefinition(id: string): Observable<Scrape> {
    return this.http.get<Scrape>(`${this.apiUrl}/scrapes/${id}`);
  }

  runScrape(
    id: string,
    runId?: string,
    variables?: Record<string, any>,
  ): Observable<ScrapeRunResponse> {
    return this.http.post<ScrapeRunResponse>(`${this.apiUrl}/run/${id}`, {
      runId,
      variables,
    });
  }

  getLogs(): Observable<ScrapeEvent[]> {
    return this.http.get<ScrapeEvent[]>(`${this.apiUrl}/logs`);
  }

  clearLogs(): Observable<{ success: boolean }> {
    return this.http.post<{ success: boolean }>(
      `${this.apiUrl}/logs/clear`,
      {},
    );
  }

  submitOtp(requestId: string, code: string): Observable<{ success: boolean }> {
    return this.http.post<{ success: boolean }>(
      `${this.apiUrl}/otp/${requestId}`,
      { code },
    );
  }

  executeOtpAction(
    requestId: string,
    selector: string,
  ): Observable<{ success: boolean }> {
    return this.http.post<{ success: boolean }>(
      `${this.apiUrl}/otp-action/${requestId}`,
      { selector },
    );
  }

  stopScrape(): Observable<{ stopped: boolean; message: string }> {
    return this.http.post<{ stopped: boolean; message: string }>(
      `${this.apiUrl}/scrape/stop`,
      {},
    );
  }

  // ============ Run History ============

  /**
   * Alle Runs abrufen (optional nach scrapeId gefiltert)
   */
  getRuns(scrapeId?: string, limit = 50): Observable<RunHistoryItem[]> {
    const params: Record<string, string> = { limit: limit.toString() };
    if (scrapeId) params['scrapeId'] = scrapeId;
    return this.http.get<RunHistoryItem[]>(`${this.apiUrl}/runs`, { params });
  }

  /**
   * Einzelnen Run mit Details abrufen
   */
  getRun(runId: string): Observable<RunHistoryItem> {
    return this.http.get<RunHistoryItem>(`${this.apiUrl}/runs/${runId}`);
  }

  /**
   * Debug-Daten für einen Run abrufen
   */
  getRunDebugData(runId: string): Observable<Record<string, any>> {
    return this.http.get<Record<string, any>>(
      `${this.apiUrl}/runs/${runId}/debug`,
    );
  }

  /**
   * Artifacts für einen Run abrufen
   */
  getRunArtifacts(runId: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/runs/${runId}/artifacts`);
  }

  /**
   * Run löschen
   */
  deleteRun(runId: string): Observable<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(
      `${this.apiUrl}/runs/${runId}`,
    );
  }

  /**
   * Alle Runs eines Scrapes löschen
   */
  deleteRunsByScrapeId(
    scrapeId: string,
  ): Observable<{ success: boolean; deleted: number }> {
    return this.http.delete<{ success: boolean; deleted: number }>(
      `${this.apiUrl}/scrapes/${scrapeId}/runs`,
    );
  }

  /**
   * Alte Runs aufräumen
   */
  cleanupRuns(olderThanDays?: number): Observable<{ success: boolean }> {
    return this.http.post<{ success: boolean }>(`${this.apiUrl}/runs/cleanup`, {
      olderThanDays,
    });
  }

  // ============ Schedule Management ============

  /**
   * Schedule für einen Scrape abrufen
   */
  getSchedule(scrapeId: string): Observable<ScrapeSchedule> {
    return this.http.get<ScrapeSchedule>(
      `${this.apiUrl}/scrapes/${scrapeId}/schedule`,
    );
  }

  /**
   * Alle Schedules abrufen
   */
  getAllSchedules(): Observable<ScrapeSchedule[]> {
    return this.http.get<ScrapeSchedule[]>(`${this.apiUrl}/schedules`);
  }

  /**
   * Schedule für einen Scrape aktualisieren
   */
  updateSchedule(
    scrapeId: string,
    schedule: Partial<
      Pick<
        ScrapeSchedule,
        'manualEnabled' | 'scheduleEnabled' | 'cronExpression' | 'timezone'
      >
    >,
  ): Observable<ScrapeSchedule> {
    return this.http.put<ScrapeSchedule>(
      `${this.apiUrl}/scrapes/${scrapeId}/schedule`,
      schedule,
    );
  }

  /**
   * Scheduler-Status abrufen
   */
  getSchedulerStatus(): Observable<
    { scrapeId: string; cronExpression: string; nextRun: number | null }[]
  > {
    return this.http.get<
      { scrapeId: string; cronExpression: string; nextRun: number | null }[]
    >(`${this.apiUrl}/scheduler/status`);
  }
}

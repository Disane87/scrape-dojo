import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

/**
 * Zentraler API-Service für alle HTTP-Kommunikation.
 * Alle Backend-Calls sollten über diesen Service laufen.
 */
@Injectable({ providedIn: 'root' })
export class ApiService {
  private http = inject(HttpClient);

  /** API Base Path - alle Endpoints sind unter /api/ */
  private readonly basePath = '/api';

  // ============ Generic HTTP Methods ============

  get<T>(endpoint: string, params?: Record<string, string>): Observable<T> {
    const url = this.buildUrl(endpoint);
    const httpParams = params
      ? new HttpParams({ fromObject: params })
      : undefined;
    return this.http.get<T>(url, { params: httpParams });
  }

  post<T>(endpoint: string, body?: unknown): Observable<T> {
    const url = this.buildUrl(endpoint);
    return this.http.post<T>(url, body ?? {});
  }

  put<T>(endpoint: string, body?: unknown): Observable<T> {
    const url = this.buildUrl(endpoint);
    return this.http.put<T>(url, body ?? {});
  }

  patch<T>(endpoint: string, body?: unknown): Observable<T> {
    const url = this.buildUrl(endpoint);
    return this.http.patch<T>(url, body ?? {});
  }

  delete<T>(endpoint: string): Observable<T> {
    const url = this.buildUrl(endpoint);
    return this.http.delete<T>(url);
  }

  // ============ Helpers ============

  /**
   * Baut die vollständige URL aus basePath + endpoint
   */
  private buildUrl(endpoint: string): string {
    // Entferne führenden Slash falls vorhanden
    const cleanEndpoint = endpoint.startsWith('/')
      ? endpoint.slice(1)
      : endpoint;
    return `${this.basePath}/${cleanEndpoint}`;
  }
}

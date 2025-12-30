import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { SecretListItem } from '@scrape-dojo/shared';
import { firstValueFrom } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class SecretsService {
  private http = inject(HttpClient);
  private readonly apiUrl = '/api/secrets';
  
  // Cached secrets list
  secrets = signal<SecretListItem[]>([]);
  loading = signal(false);
  error = signal<string | null>(null);

  async loadSecrets(): Promise<SecretListItem[]> {
    this.loading.set(true);
    this.error.set(null);
    
    try {
      const secrets = await firstValueFrom(
        this.http.get<SecretListItem[]>(this.apiUrl)
      );
      this.secrets.set(secrets);
      return secrets;
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : 'Failed to load secrets';
      this.error.set(errorMsg);
      throw e;
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * Alias für loadSecrets - gibt die aktuell geladenen Secrets zurück
   */
  async getSecrets(): Promise<SecretListItem[]> {
    return this.loadSecrets();
  }

  async getSecret(id: string): Promise<SecretListItem> {
    return firstValueFrom(
      this.http.get<SecretListItem>(`${this.apiUrl}/${id}`)
    );
  }

  async createSecret(name: string, value: string, description?: string): Promise<SecretListItem> {
    const secret = await firstValueFrom(
      this.http.post<SecretListItem>(this.apiUrl, { name, value, description })
    );
    await this.loadSecrets(); // Refresh list
    return secret;
  }

  async updateSecret(id: string, updates: { name?: string; value?: string; description?: string }): Promise<SecretListItem> {
    const secret = await firstValueFrom(
      this.http.put<SecretListItem>(`${this.apiUrl}/${id}`, updates)
    );
    await this.loadSecrets(); // Refresh list
    return secret;
  }

  async deleteSecret(id: string): Promise<void> {
    await firstValueFrom(
      this.http.delete<{ success: boolean }>(`${this.apiUrl}/${id}`)
    );
    await this.loadSecrets(); // Refresh list
  }

  async linkToWorkflow(secretId: string, workflowId: string): Promise<void> {
    await firstValueFrom(
      this.http.post<{ success: boolean }>(`${this.apiUrl}/${secretId}/link/${workflowId}`, {})
    );
    await this.loadSecrets(); // Refresh list
  }

  async unlinkFromWorkflow(secretId: string, workflowId: string): Promise<void> {
    await firstValueFrom(
      this.http.delete<{ success: boolean }>(`${this.apiUrl}/${secretId}/link/${workflowId}`)
    );
    await this.loadSecrets(); // Refresh list
  }

  /**
   * Get secrets that can be used for a specific variable type
   */
  getSecretsForVariable(variableType: string): SecretListItem[] {
    // All secrets can be used for any variable for now
    return this.secrets();
  }
}

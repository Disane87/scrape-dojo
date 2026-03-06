import { TestBed } from '@angular/core/testing';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { SecretsService } from './secrets.service';

describe('SecretsService', () => {
  let service: SecretsService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        SecretsService,
      ],
    });
    service = TestBed.inject(SecretsService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    // Discard any outstanding requests (e.g. auto-refresh calls)
    httpMock.match(() => true);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getSecrets', () => {
    it('should retrieve list of secrets', async () => {
      const mockSecrets = [
        { id: '1', name: 'secret1', description: 'Secret 1' },
        { id: '2', name: 'secret2', description: 'Secret 2' },
      ];

      const promise = service.getSecrets();

      const req = httpMock.expectOne('/api/secrets');
      expect(req.request.method).toBe('GET');
      req.flush(mockSecrets);

      const secrets = await promise;
      expect(secrets.length).toBe(2);
      expect(secrets[0].name).toBe('secret1');
    });
  });

  describe('createSecret', () => {
    it('should send POST request to create secret', () => {
      const newSecret = {
        name: 'new-secret',
        value: 'secret-value',
        description: 'New Secret',
      };

      // Don't await — just fire and verify the request
      service.createSecret(
        newSecret.name,
        newSecret.value,
        newSecret.description,
      );

      const req = httpMock.expectOne('/api/secrets');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(newSecret);
    });
  });

  describe('updateSecret', () => {
    it('should send PUT request to update secret', () => {
      const secretId = '1';
      const updates = { value: 'updated-value', description: 'Updated' };

      service.updateSecret(secretId, updates);

      const req = httpMock.expectOne(`/api/secrets/${secretId}`);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual(updates);
    });
  });

  describe('deleteSecret', () => {
    it('should send DELETE request', () => {
      const secretId = '1';

      service.deleteSecret(secretId);

      const req = httpMock.expectOne(`/api/secrets/${secretId}`);
      expect(req.request.method).toBe('DELETE');
    });
  });
});

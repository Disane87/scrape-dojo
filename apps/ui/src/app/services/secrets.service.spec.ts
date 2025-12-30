import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { SecretsService } from './secrets.service';

describe('SecretsService', () => {
  let service: SecretsService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [SecretsService],
    });
    service = TestBed.inject(SecretsService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
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
    it('should create new secret', async () => {
      const newSecret = {
        name: 'new-secret',
        value: 'secret-value',
        description: 'New Secret',
      };
      const mockResponse = { id: '3', ...newSecret };

      const promise = service.createSecret(newSecret.name, newSecret.value, newSecret.description);

      const req = httpMock.expectOne('/api/secrets');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(newSecret);
      req.flush(mockResponse);

      const refreshReq = httpMock.expectOne('/api/secrets');
      expect(refreshReq.request.method).toBe('GET');
      refreshReq.flush([]);

      const response = await promise;
      expect(response.id).toBe('3');
      expect(response.name).toBe('new-secret');
    });
  });

  describe('updateSecret', () => {
    it('should update existing secret', async () => {
      const secretId = '1';
      const updates = {
        value: 'updated-value',
        description: 'Updated description',
      };
      const mockResponse = { id: secretId, name: 'secret1', ...updates };

      const promise = service.updateSecret(secretId, updates);

      const req = httpMock.expectOne(`/api/secrets/${secretId}`);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual(updates);
      req.flush(mockResponse);

      const refreshReq = httpMock.expectOne('/api/secrets');
      expect(refreshReq.request.method).toBe('GET');
      refreshReq.flush([]);

      const response = await promise;
      expect(response.id).toBe(secretId);
    });
  });

  describe('deleteSecret', () => {
    it('should delete secret', async () => {
      const secretId = '1';

      const promise = service.deleteSecret(secretId);

      const req = httpMock.expectOne(`/api/secrets/${secretId}`);
      expect(req.request.method).toBe('DELETE');
      req.flush({});

      const refreshReq = httpMock.expectOne('/api/secrets');
      expect(refreshReq.request.method).toBe('GET');
      refreshReq.flush([]);

      await promise;
    });
  });
});

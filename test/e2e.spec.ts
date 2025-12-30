import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../apps/api/src/app.module';

describe('Scrape Dojo E2E Tests', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Health Endpoints', () => {
    it('/api/health (GET) should return health status', () => {
      return request(app.getHttpServer())
        .get('/api/health')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('status');
          expect(res.body.status).toBe('ok');
        });
    });

    it('/api/health/live (GET) should return liveness', () => {
      return request(app.getHttpServer())
        .get('/api/health/live')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('status');
        });
    });

    it('/api/health/ready (GET) should return readiness', () => {
      return request(app.getHttpServer())
        .get('/api/health/ready')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('status');
        });
    });
  });

  describe('Scrapes API', () => {
    it('/api/scrapes (GET) should return list of scrapes', () => {
      return request(app.getHttpServer())
        .get('/api/scrapes')
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
        });
    });

    it('/api/scrapes/:id (GET) should return specific scrape', () => {
      return request(app.getHttpServer())
        .get('/api/scrapes')
        .expect(200)
        .then((res) => {
          if (res.body.length > 0) {
            const scrapeId = res.body[0].id;
            return request(app.getHttpServer())
              .get(`/api/scrapes/${scrapeId}`)
              .expect(200)
              .expect((res) => {
                expect(res.body).toHaveProperty('id');
                expect(res.body.id).toBe(scrapeId);
              });
          }
        });
    });
  });

  describe('Actions API', () => {
    it('/api/actions/metadata (GET) should return actions metadata', () => {
      return request(app.getHttpServer())
        .get('/api/actions/metadata')
        .expect(200)
        .expect((res) => {
          expect(typeof res.body).toBe('object');
          expect(res.body).toHaveProperty('navigate');
          expect(res.body).toHaveProperty('click');
          expect(res.body).toHaveProperty('extract');
        });
    });
  });

  describe('Secrets API', () => {
    it('/secrets (GET) should return list of secrets', () => {
      return request(app.getHttpServer())
        .get('/secrets')
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
        });
    });

    it('/secrets (POST) should create new secret', async () => {
      const newSecret = {
        name: `test-secret-${Date.now()}`,
        value: 'test-value',
        description: 'Test Secret',
      };

      const createResponse = await request(app.getHttpServer())
        .post('/secrets')
        .send(newSecret)
        .expect(201);

      expect(createResponse.body).toHaveProperty('id');
      expect(createResponse.body.name).toBe(newSecret.name);

      // Cleanup: delete created secret
      await request(app.getHttpServer())
        .delete(`/secrets/${createResponse.body.id}`)
        .expect(200);
    });

    it('/secrets/:id (PUT) should update secret', async () => {
      // First create a secret
      const newSecret = {
        name: `test-secret-${Date.now()}`,
        value: 'test-value',
        description: 'Test Secret',
      };

      const createResponse = await request(app.getHttpServer())
        .post('/secrets')
        .send(newSecret)
        .expect(201);

      const secretId = createResponse.body.id;

      // Update the secret
      const updates = {
        value: 'updated-value',
        description: 'Updated Description',
      };

      await request(app.getHttpServer())
        .put(`/secrets/${secretId}`)
        .send(updates)
        .expect(200);

      // Cleanup
      await request(app.getHttpServer())
        .delete(`/secrets/${secretId}`)
        .expect(200);
    });

    it('/secrets/:id (DELETE) should delete secret', async () => {
      // First create a secret
      const newSecret = {
        name: `test-secret-${Date.now()}`,
        value: 'test-value',
        description: 'Test Secret',
      };

      const createResponse = await request(app.getHttpServer())
        .post('/secrets')
        .send(newSecret)
        .expect(201);

      const secretId = createResponse.body.id;

      // Delete the secret
      await request(app.getHttpServer())
        .delete(`/secrets/${secretId}`)
        .expect(200);

      // Verify it's deleted
      await request(app.getHttpServer())
        .get(`/secrets/${secretId}`)
        .expect(404);
    });
  });

  describe('Database API', () => {
    it('/api/runs/history/:scrapeId (GET) should return run history', () => {
      return request(app.getHttpServer())
        .get('/api/runs/history/test-scrape?limit=10')
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
        });
    });

    it('/api/data/:scrapeId (GET) should return scrape data', () => {
      return request(app.getHttpServer())
        .get('/api/data/test-scrape?limit=10')
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
        });
    });
  });

  describe('Variables API', () => {
    it('/api/variables/:scrapeId (GET) should return variables', () => {
      return request(app.getHttpServer())
        .get('/api/variables/test-scrape')
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
        });
    });

    it('/api/variables/:scrapeId (POST) should create variable', async () => {
      const newVariable = {
        name: `test-var-${Date.now()}`,
        value: 'test-value',
      };

      await request(app.getHttpServer())
        .post('/api/variables/test-scrape')
        .send(newVariable)
        .expect(201);

      // Cleanup
      await request(app.getHttpServer())
        .delete(`/api/variables/test-scrape/${newVariable.name}`)
        .expect(200);
    });
  });
});

import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { EventLogger } from './_logger/event-logger';
import * as fs from 'fs';
import * as path from 'path';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  // Custom Logger setzen, der auch an die UI sendet
  const eventLogger = await app.resolve(EventLogger);
  eventLogger.setContext('Bootstrap');
  app.useLogger(eventLogger);

  const port = process.env.SCRAPE_DOJO_PORT ?? 3000;

  app.enableShutdownHooks();

  // OIDC alias routes
  // The UI talks to the API via /api (see UI proxy), while OIDC providers often redirect to a fixed /auth/oidc/* callback.
  // Keep the global /api prefix for all Nest routes, but allow /auth/oidc/* by rewriting to /api/auth/oidc/*.
  app.use((req: any, _res: any, next: any) => {
    const url = typeof req?.url === 'string' ? req.url : '';
    if (url.startsWith('/auth/oidc/')) {
      req.url = `/api${url}`;
    }
    next();
  });

  app.setGlobalPrefix('api');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // If behind a reverse proxy (typical in production), this is required for correct client IP / rate-limit.
  // Nest wraps the underlying platform instance; configure the Express app directly.
  const httpInstance: any = app.getHttpAdapter().getInstance();
  if (httpInstance && typeof httpInstance.set === 'function') {
    const trustProxy = Number(process.env.SCRAPE_DOJO_TRUST_PROXY ?? 1);
    httpInstance.set('trust proxy', Number.isFinite(trustProxy) ? trustProxy : 1);
  }

  // CORS: allow explicit origins in prod; be permissive in dev to support local setups.
  const corsOrigins = (process.env.SCRAPE_DOJO_CORS_ORIGIN ?? '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);

  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    app.enableCors({ origin: true, credentials: true });
  } else if (corsOrigins.length > 0) {
    app.enableCors({ origin: corsOrigins, credentials: true });
  }

  app.use(
    helmet({
      // API is used by the UI (same-origin via proxy in dev); keep defaults and disable CSP unless explicitly needed.
      contentSecurityPolicy: false,
    }),
  );

  // Rate limit only the most sensitive public auth endpoints.
  const authWindowMs = Number(process.env.SCRAPE_DOJO_AUTH_RATE_LIMIT_WINDOW_MS ?? 60_000);
  const authMax = Number(process.env.SCRAPE_DOJO_AUTH_RATE_LIMIT_MAX ?? 30);
  const authLimiter = rateLimit({
    windowMs: Number.isFinite(authWindowMs) ? authWindowMs : 60_000,
    max: Number.isFinite(authMax) ? authMax : 30,
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.use('/api/auth/login', authLimiter);
  app.use('/api/auth/register', authLimiter);
  app.use('/api/auth/refresh', authLimiter);

  // Swagger Setup
  const config = new DocumentBuilder()
    .setTitle('Scrape Dojo API')
    .setDescription('API für modulares Web-Scraping mit Puppeteer')
    .setVersion('1.0')
    .addTag('scrapes', 'Scrape-Definitionen und Ausführung')
    .addTag('secrets', 'Secrets Management')
    .addTag('logs', 'Logging und Events')
    .addTag('auth', 'Authentication & Authorization')
    .addTag('users', 'User Management')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT token',
        in: 'header',
      },
      'JWT-auth',
    )
    .addServer(`http://localhost:${port}/api`, 'Development Server')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  // Export OpenAPI spec if requested
  if (process.env.EXPORT_OPENAPI === 'true') {
    const outputPath = path.join(__dirname, '..', 'openapi.json');
    fs.writeFileSync(outputPath, JSON.stringify(document, null, 2));
    eventLogger.log(`✅ OpenAPI specification exported to: ${outputPath}`);
  }

  await app.listen(port);

  eventLogger.log(`🚀 Application is running on: http://localhost:${port}`);
  eventLogger.log(`📚 API Documentation: http://localhost:${port}/api/docs`);
  
  return; // Verhindert "undefined" im Log
}

bootstrap();

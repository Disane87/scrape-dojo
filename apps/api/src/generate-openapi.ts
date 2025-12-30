import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import * as fs from 'fs';
import * as path from 'path';

async function generateOpenApiSpec() {
  const app = await NestFactory.create(AppModule, {
    logger: false, // Disable logging for clean output
  });

  const config = new DocumentBuilder()
    .setTitle('Scrape Dojo API')
    .setDescription('API für modulares Web-Scraping mit Puppeteer')
    .setVersion('1.0')
    .addTag('scrapes', 'Scrape-Definitionen und Ausführung')
    .addTag('secrets', 'Secrets Management')
    .addTag('logs', 'Logging und Events')
    .addServer('http://localhost:3000', 'Development Server')
    .build();

  const document = SwaggerModule.createDocument(app, config);

  // Save to apps/api/openapi.json
  const outputPath = path.join(__dirname, '..', 'openapi.json');
  fs.writeFileSync(outputPath, JSON.stringify(document, null, 2));

  console.log(`✅ OpenAPI specification generated at: ${outputPath}`);

  await app.close();
  process.exit(0);
}

generateOpenApiSpec().catch((err) => {
  console.error('❌ Failed to generate OpenAPI spec:', err);
  process.exit(1);
});

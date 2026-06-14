import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ApiResponseInterceptor } from './common/api-response.interceptor';
import { HttpErrorFilter } from './common/http-error.filter';
import { auditRequests, createRateLimiter, requestContext, sanitizeInput, securityHeaders } from './common/security.middleware';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(requestContext);
  const allowedOrigins = (process.env.CORS_ALLOWED_ORIGINS || 'http://localhost:3001,http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
    allowedHeaders: ['Authorization', 'Content-Type', 'Idempotency-Key', 'X-Request-Id'],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });
  app.setGlobalPrefix('api/v1');
  app.use(securityHeaders);
  app.use(sanitizeInput);
  app.use(auditRequests);
  app.use(createRateLimiter(60_000, 200));
  app.use('/api/v1/auth', createRateLimiter(60_000, 20));
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  app.useGlobalInterceptors(new ApiResponseInterceptor());
  app.useGlobalFilters(new HttpErrorFilter());
  await app.listen(process.env.PORT ? Number(process.env.PORT) : 3000);
}

void bootstrap();

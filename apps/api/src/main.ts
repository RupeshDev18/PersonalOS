import { NestFactory, Reflector } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { AuthGuard } from './auth/auth.guard';
import { AuthService } from './auth/auth.service';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  // CORS — tighten in production to your actual frontend origin.
  app.enableCors({
    origin: process.env.FRONTEND_URL ?? 'http://localhost:3000',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  });

  // Global auth guard — every route is protected unless decorated @Public().
  const reflector = app.get(Reflector);
  const authService = app.get(AuthService);
  app.useGlobalGuards(new AuthGuard(authService, reflector));

  // DTO validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // Swagger
  const config = new DocumentBuilder()
    .setTitle('Personal AI Operating System API')
    .setDescription('Chief Agent & Multi-Agent Orchestration Platform API')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('auth')
    .addTag('agents')
    .addTag('tasks')
    .addTag('approvals')
    .addTag('audit')
    .addTag('jobs')
    .addTag('finance')
    .addTag('shopping')
    .addTag('connectors')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT ?? 4000;
  await app.listen(port);
  logger.log(`Personal AI OS Backend is running on port: ${port}`);
  logger.log(`Swagger docs → http://localhost:${port}/api/docs`);
}

bootstrap();

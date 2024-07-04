import { NestFactory, Reflector } from '@nestjs/core';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ClassSerializerInterceptor, ValidationPipe } from '@nestjs/common';
import { ClassValidatorExceptionsFilter } from './shared/class-validator-exption.filter';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.useGlobalPipes(new ValidationPipe());

  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));

  app.useGlobalFilters(new ClassValidatorExceptionsFilter());

  app.enableCors({
    allowedHeaders:
      'Access-Control-Allow-Headers, Origin,Accept, X-Requested-With, Content-Type, Access-Control-Request-Method, Access-Control-Request-Headers, Authorization',
    origin: process.env.URL_FRONT || '*',
    credentials: true,
  });

  await app.listen(process.env.PORT || 3000);
  console.log('🚀 Server started at ' + process.env.URL_BACK);
}
bootstrap();

import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationErrorException } from './common/exception/service.exception';
import { ServiceExceptionToHttpExceptionFilter } from './common/exception/service.exception.to.http.exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      // 검증 실패도 ServiceException 으로 모아 응답 포맷을 통성일함.
      exceptionFactory: (errors) =>
        ValidationErrorException(
          errors
            .map((error) => Object.values(error.constraints ?? {}).join(', '))
            .join(' / ') || undefined,
        ),
    }),
  );

  app.useGlobalFilters(new ServiceExceptionToHttpExceptionFilter());
  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();

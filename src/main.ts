import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ServiceExceptionToHttpExceptionFilter } from './common/exception/service.exception.to.http.exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalFilters(new ServiceExceptionToHttpExceptionFilter());

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();

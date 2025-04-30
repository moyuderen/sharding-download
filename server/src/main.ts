import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.setGlobalPrefix('api');
  app.enableCors({
    origin(origin, callback) {
      callback(null, true);
    },
    credentials: true,
    exposedHeaders: 'Content-Range, Content-Disposition, Etag, Content-Type',
  });

  // 配置静态文件
  app.useStaticAssets(join(__dirname, '..', 'public'), {
    prefix: '/static',
    setHeaders: (res, path) => {
      console.log(`[${new Date().toISOString()}] 提供静态文件: ${path}`);
    },
  });
  await app.listen(3100);
}
bootstrap();

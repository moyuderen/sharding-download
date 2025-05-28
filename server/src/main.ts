import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const port = 3100;
  app.setGlobalPrefix('api');
  app.enableCors({
    origin(origin, callback) {
      callback(null, true);
    },
    credentials: true,
    exposedHeaders: 'Content-Range, Content-Disposition, Etag, Content-Type',
  });

  const options = new DocumentBuilder()
    .setTitle('Sharding Download')
    .setDescription('分片下载文件接口API')
    .setVersion('1.0')
    .build();
  const document = SwaggerModule.createDocument(app, options);
  SwaggerModule.setup('api', app, document, {
    customCssUrl: '/static/swagger-ui/swagger-ui.css',
    customJs: [
      '/static/swagger-ui/swagger-ui-bundle.js',
      '/static/swagger-ui/swagger-ui-standalone-preset.js',
    ],
  });

  // 配置静态文件
  app.useStaticAssets(join(__dirname, '..', 'public'), {
    prefix: '/static',
    setHeaders: (res, path) => {
      console.log(`[${new Date().toISOString()}] 提供静态文件: ${path}`);
    },
  });
  Logger.debug(`Nest.js server started on port ${port}.`, 'Bootstrap');
  await app.listen(port);
}
bootstrap();

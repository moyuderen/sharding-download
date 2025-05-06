"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const swagger_1 = require("@nestjs/swagger");
const app_module_1 = require("./app.module");
const path_1 = require("path");
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    app.setGlobalPrefix('api');
    app.enableCors({
        origin(origin, callback) {
            callback(null, true);
        },
        credentials: true,
        exposedHeaders: 'Content-Range, Content-Disposition, Etag, Content-Type',
    });
    const options = new swagger_1.DocumentBuilder()
        .setTitle('Sharding Download')
        .setDescription('分片下载文件接口API')
        .setVersion('1.0')
        .build();
    const document = swagger_1.SwaggerModule.createDocument(app, options);
    swagger_1.SwaggerModule.setup('api', app, document);
    app.useStaticAssets((0, path_1.join)(__dirname, '..', 'public'), {
        prefix: '/static',
        setHeaders: (res, path) => {
            console.log(`[${new Date().toISOString()}] 提供静态文件: ${path}`);
        },
    });
    await app.listen(3100);
}
bootstrap();
//# sourceMappingURL=main.js.map
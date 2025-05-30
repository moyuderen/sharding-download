"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const app_module_1 = require("./app.module");
const path_1 = require("path");
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    const port = 3100;
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
    swagger_1.SwaggerModule.setup('api', app, document, {
        customCssUrl: '/static/swagger-ui/swagger-ui.css',
        customJs: [
            '/static/swagger-ui/swagger-ui-bundle.js',
            '/static/swagger-ui/swagger-ui-standalone-preset.js',
        ],
    });
    app.useStaticAssets((0, path_1.join)(__dirname, '..', 'public'), {
        prefix: '/static',
        setHeaders: (res, path) => {
            console.log(`[${new Date().toISOString()}] 提供静态文件: ${path}`);
        },
    });
    common_1.Logger.debug(`Nest.js server started on port ${port}.`, 'Bootstrap');
    await app.listen(port);
}
bootstrap();
//# sourceMappingURL=main.js.map
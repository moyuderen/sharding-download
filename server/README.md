# sharding-download server

`server/` 是 `sharding-download` 项目的示例服务端，基于 NestJS 实现，主要用于给前端 SDK 提供分片下载能力和本地调试环境。

它演示了一个支持 **HTTP Range 请求** 的文件下载服务端，包含：

- 文件元信息获取
- 分片下载 / 整文件下载
- Swagger 文档
- 本地静态文件目录
- Vercel 部署配置

## 目录结构

```text
server/
├── public/                  # 静态文件目录，示例下载文件放这里
│   ├── 711.jpg
│   ├── book.pdf
│   └── swagger-ui/
├── src/
│   ├── app.controller.ts    # 健康检查接口
│   ├── app.module.ts        # 根模块
│   ├── main.ts              # 应用启动、CORS、Swagger、静态资源配置
│   ├── share.ts             # 公共工具（当前包含 sleep 调试延时）
│   └── file/
│       ├── file.controller.ts # 下载相关接口
│       ├── file.dto.ts        # 请求 DTO
│       ├── file.module.ts     # 文件模块
│       └── file.service.ts    # 文件校验、Range 解析、ETag、流式返回
├── test/
│   └── app.e2e-spec.ts      # e2e 测试
└── vercel.json              # Vercel 配置
```

## 功能说明

### 1. 健康检查

用于确认服务是否正常启动：

- `GET /api/healthy`

返回：

```text
healthy
```

### 2. 获取文件元信息

前端 SDK 在开始分片下载前，会先获取文件大小、ETag、最后修改时间等信息。

- `GET /api/file/getFileMeta/:filename`

示例：

```bash
curl "http://localhost:3100/api/file/getFileMeta/711.jpg"
```

返回示例：

```json
{
  "size": 1847928,
  "eTag": "afe35b83ccd35635b9ea7dc49ba5808c811da2138c90b5b38",
  "lastModified": "2025-05-06T03:10:20.391Z",
  "name": "711.jpg"
}
```

### 3. 分片下载 / 整文件下载

- `POST /api/file/download`

这个接口既支持：

- **整文件下载**：不带 `Range` 头
- **分片下载**：带 `Range: bytes=start-end` 头

请求 body 至少需要：

```json
{
  "url": "711.jpg"
}
```

说明：

- 前端 SDK 还可能额外传 `index`、`name` 或其他业务字段
- 服务端当前不会拦截这些额外字段
- 实际使用时只依赖 `url`

#### 整文件下载示例

```bash
curl -X POST "http://localhost:3100/api/file/download" \
  -H "Content-Type: application/json" \
  -d '{"url":"711.jpg"}' \
  -o 711.jpg
```

#### 分片下载示例

```bash
curl -X POST "http://localhost:3100/api/file/download" \
  -H "Content-Type: application/json" \
  -H "Range: bytes=0-1024" \
  -d '{"url":"711.jpg"}' \
  -i
```

返回特征：

- 状态码 `206 Partial Content`
- `Content-Range`
- `Content-Length`
- `Accept-Ranges: bytes`
- `ETag`
- `Content-Disposition`

### 4. 接口延时调试

当前下载接口保留了 `sleep()` 调试逻辑，用于模拟接口延时，方便前端验证：

- 分片下载进度展示
- 重试逻辑
- 暂停/恢复逻辑
- 慢网环境体验

对应位置：

- `src/share.ts`
- `src/file/file.controller.ts`

## 技术实现

### Range 请求支持

核心逻辑位于：

- `src/file/file.service.ts`

主要职责：

- 校验文件路径合法性
- 阻止路径遍历
- 拒绝符号链接文件
- 解析 `Range` 请求头
- 处理整文件 / 单分片流式输出
- 为响应补充 `ETag`、`Content-Range` 等头

### ETag 优化

为了避免每个分片请求都重复完整计算文件哈希，服务端做了两层优化：

- 小文件：计算 SHA-256，并做内存缓存
- 大文件：使用弱 ETag
- 并发请求：同一文件的 ETag 计算会做 promise 级去重

### 路径安全

文件路径通过 `resolve()` 校验，避免越权访问 `public/` 目录外的内容。

### 静态文件目录

默认文件目录：

```text
server/public/
```

默认通过以下方式访问 Swagger 资源：

- `/static/swagger-ui/*`

## 本地开发

### 安装依赖

```bash
pnpm install
```

### 启动开发环境

```bash
pnpm start:dev
```

默认端口：

```text
3100
```

健康检查：

```text
http://localhost:3100/api/healthy
```

Swagger 文档：

```text
http://localhost:3100/api
```

### 常用脚本

```bash
# 开发模式
pnpm start:dev

# debug 模式
pnpm start:debug

# 构建
pnpm build

# 生产启动
pnpm start:prod

# lint
pnpm lint

# format
pnpm format

# 单元测试
pnpm test

# e2e 测试
pnpm test:e2e
```

## 环境变量

当前服务端只使用少量环境变量：

| 变量名 | 默认值 | 说明 |
|--------|--------|------|
| `PORT` | `3100` | 服务启动端口 |
| `STORAGE_PATH` | `server/public` | 文件存储目录 |
| `DEBUG_STATIC_ASSETS` | `false` | 是否打印静态资源访问日志 |

示例：

```bash
PORT=3200 STORAGE_PATH=/absolute/path/to/files pnpm start:dev
```

## 测试

### e2e

```bash
pnpm test:e2e
```

当前会验证：

- `GET /api/healthy` 返回 `healthy`

## 部署

### Vercel

项目包含 `vercel.json`，用于部署 API 和静态资源：

- `/api/*` → Nest 服务
- `/static/*` → `public/` 静态资源

当前配置文件：

- `server/vercel.json`

### 注意事项

如果你打算把这个服务端用于正式环境，而不只是示例服务，建议继续补充：

- 更明确的业务级鉴权
- 更完善的错误码设计
- 更细粒度的 DTO 校验
- 上传 / 存储系统抽象
- 更稳定的服务端部署方案与日志系统

## 与前端 SDK 的配合方式

前端 SDK 默认会：

1. 先请求文件元信息
2. 再按 chunk 发起多个 Range 下载请求
3. 最终在浏览器端合并 Blob

因此这个服务端的关键职责不是复杂业务，而是正确支持：

- `Range`
- `Content-Range`
- `Accept-Ranges`
- `ETag`
- `Content-Disposition`

如果这些头返回不正确，前端 SDK 的分片下载、断点续传和文件名解析都会受影响。

## 相关文件

- `src/main.ts` - 启动配置
- `src/app.controller.ts` - 健康检查
- `src/file/file.controller.ts` - 下载接口
- `src/file/file.service.ts` - 下载核心逻辑
- `vercel.json` - 部署配置
- `test/app.e2e-spec.ts` - e2e 测试

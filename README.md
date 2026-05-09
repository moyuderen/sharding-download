# sharding-download

基于 HTTP Range 请求的浏览器端大文件分片下载方案，支持断点续传、并发下载、暂停/恢复、自动重试，使用 IndexedDB 持久化分片数据。

## 特性

- **分片下载** - 将大文件拆分为多个分片，使用 HTTP Range 请求并发下载
- **断点续传** - 分片数据持久化到 IndexedDB，页面关闭后可恢复下载
- **并发控制** - 可配置并发线程数，默认 6 个并发
- **暂停/恢复/重试** - 完整的下载生命周期控制
- **自动重试** - 分片下载失败自动重试，可配置重试次数和间隔
- **零依赖** - 纯浏览器 API 实现，无运行时依赖
- **TypeScript** - 完整的类型定义支持
- **自定义请求** - 支持自定义请求函数和请求参数/headers

## 项目架构

```
sharding-download/
├── packages/sdk/          # 核心 SDK (npm: sharding-downloader)
│   ├── src/
│   │   ├── core/
│   │   │   ├── Downloader.ts      # 下载器主类
│   │   │   ├── FileContext.ts      # 文件上下文管理
│   │   │   ├── Chunk.ts           # 分片下载单元
│   │   │   ├── Event.ts           # 事件系统
│   │   │   ├── storage/           # IndexedDB 存储层
│   │   │   └── constants.ts       # 默认配置与常量
│   │   ├── helper/                # 工具函数
│   │   └── index.ts               # 入口文件
│   ├── examples/                  # 使用示例
│   └── vite.config.ts            # 构建配置 (ES/UMD/CJS)
├── server/                # NestJS 示例服务端
│   └── src/
│       ├── file/                  # 文件服务 (Range 请求支持)
│       ├── app.module.ts
│       └── main.ts               # CORS、Swagger、静态文件配置
├── docs/                  # VitePress 文档站点
│   ├── quick-start/               # 快速开始文档
│   └── .vitepress/config.mts
└── pnpm-workspace.yaml    # monorepo 工作空间配置
```

### 下载流程

```
1. 获取文件元信息 (HEAD 请求 → content-range/content-disposition/etag)
2. 计算分片数量 (fileSize / chunkSize)
3. 并发下载分片 (async pool 控制并发数)
   └── 每个分片: Range 请求 → 存入 IndexedDB → 更新进度
4. 合并分片 (按序读取 → Blob → ObjectURL)
5. 触发成功回调
```

## 安装

```bash
npm install sharding-downloader
```

## 使用

### 基础用法

```javascript
import { Downloader, Callbacks } from 'sharding-downloader'

const downloader = new Downloader({
  action: 'https://your-server.com/api/file/download',
})

// 监听下载状态
downloader.on(Callbacks.CHANGE, (file, fileList) => {
  console.log('状态变化:', file.status)
})

downloader.on(Callbacks.SUCCESS, (file, fileList) => {
  console.log('下载完成:', file.link) // blob URL
  window.open(file.link)
})

downloader.on(Callbacks.FAILED, (file, fileList) => {
  console.log('下载失败:', file)
})

downloader.on(Callbacks.PROGRESS, (file, fileList) => {
  console.log(`进度: ${(file.progress * 100).toFixed(1)}%`)
})

// 开始下载
downloader.start('example.pdf')
```

### 控制下载

```javascript
// 通过 CHANGE 回调获取 file 对象
downloader.on(Callbacks.CHANGE, (file) => {
  // 暂停
  file.pause()
  // 恢复 (断点续传)
  file.resume()
  // 重试
  file.retry()
  // 取消
  file.cancel()
})
```

### 自定义请求参数

```javascript
const downloader = new Downloader({
  action: 'https://your-server.com/api/file/download',
  data: { token: 'xxx', fileId: '123' },       // 自定义请求 body
  headers: { Authorization: 'Bearer xxx' },      // 自定义请求头
})
```

### 自定义请求函数

```javascript
const downloader = new Downloader({
  action: 'https://your-server.com/api/file/download',
  customRequest: async (options) => {
    // options: { url, method, headers, data, onProgress, responseType }
    const response = await fetch(options.url, {
      method: options.method,
      headers: options.headers,
      body: JSON.stringify(options.data),
    })
    return response
  },
  requestSucceed: async (response) => {
    // 验证响应是否成功
    return response.ok
  },
})
```

## 配置项

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `action` | `string` | `''` | 下载接口地址 |
| `data` | `Record<string, any>` | `{}` | 自定义请求参数 |
| `headers` | `Record<string, string>` | `{ 'content-type': 'application/json;charset=UTF-8' }` | 自定义请求头 |
| `chunkSize` | `number` | `2097152` (2MB) | 分片大小 (字节) |
| `threads` | `number` | `6` | 并发线程数 |
| `maxRetries` | `number` | `3` | 最大重试次数 |
| `retryInterval` | `number` | `500` | 重试间隔 (毫秒) |
| `isPart` | `boolean` | `true` | 是否启用分片下载 |
| `storageName` | `string` | `'file_chunks_db'` | IndexedDB 数据库名 |
| `storageVersion` | `number` | `1` | IndexedDB 版本号 |
| `customRequest` | `Request` | 默认 XHR 请求 | 自定义请求函数 |
| `requestSucceed` | `(data) => Promise<boolean>` | 检查响应 code | 请求成功验证函数 |

## 回调事件

| 事件名 | 说明 | 回调参数 |
|--------|------|----------|
| `Callbacks.CHANGE` | 文件状态变化 | `(file: FileItem, fileList: FileItem[])` |
| `Callbacks.SUCCESS` | 下载成功 | `(file: FileItem, fileList: FileItem[])` |
| `Callbacks.FAILED` | 下载失败 | `(file: FileItem \| null, fileList: FileItem[])` |
| `Callbacks.PROGRESS` | 下载进度更新 | `(file: FileItem, fileList: FileItem[])` |
| `Callbacks.CANCELLED` | 下载取消 | `(file: FileItem, fileList: FileItem[])` |

### FileItem 属性

| 属性 | 类型 | 说明 |
|------|------|------|
| `id` | `string` | 文件唯一标识 |
| `name` | `string` | 文件名 |
| `size` | `number` | 文件大小 (字节) |
| `progress` | `number` | 下载进度 (0-1) |
| `status` | `FileStatus` | 当前状态 |
| `link` | `string` | 下载完成后的 Blob URL |
| `loadedSize` | `number` | 已下载大小 |

### 文件状态 (FileStatus)

```
init → ready → downloading → downloaded → success
                  ↓              ↓
               cancelled      failed
```

## 服务端要求

SDK 使用 HTTP Range 请求下载分片，服务端需要支持以下协议：

### 1. 获取文件元信息

SDK 会发送 `HEAD` 请求 (带 `Range: bytes=0-1`)，服务端需返回：

- `Content-Range: bytes 0-1/{fileSize}` - 文件总大小
- `Content-Disposition: attachment; filename*=UTF-8''{filename}` - 文件名
- `ETag: {fileHash}` - 文件唯一标识

### 2. 分片下载

SDK 会发送 `POST` 请求，带 `Range` 头：

```
Range: bytes=0-2097151
```

服务端需返回：

- Status `206 Partial Content`
- `Content-Range: bytes 0-2097151/{totalSize}`
- `Content-Length: {chunkSize}`
- 分片二进制数据

### 示例服务端

项目内置了一个 NestJS 示例服务端 (`server/` 目录)，实现了完整的 Range 请求支持：

- `GET /api/file/getFileMeta/:filename` - 获取文件元信息
- `POST /api/file/download` - 下载文件 (支持 Range)

在线演示: https://sharding-download-server.vercel.app/api

## 开发

### 环境要求

- Node.js >= 18
- pnpm >= 8

### 安装依赖

在仓库根目录执行一次即可安装整个 workspace 的依赖：

```bash
pnpm install
```

### 开发模式

```bash
# SDK 开发 (端口 3201，自动打开示例页面)
pnpm sdk:dev

# 服务端开发 (端口 3100，热重载)
pnpm server:dev

# 服务端调试模式 (端口 3100，带 debug)
pnpm server:debug

# 文档站点开发 (端口 3300)
pnpm docs:dev
```

### 构建

```bash
# 构建 SDK
pnpm sdk:build

# 构建服务端
pnpm server:build

# 构建文档
pnpm docs:build

# 一次构建整个仓库
pnpm build
```

### 预览

```bash
# 预览文档站点 (端口 3400)
pnpm docs:preview
```

### 发布

项目使用 [Changesets](https://github.com/changesets/changesets) 管理版本。

当前仓库里：
- 真正发布到 npm 的包是 `packages/sdk` 下的 `sharding-downloader`
- 根目录 `package.json` 只是工作区脚本入口，不会发布
- `server/` 和 `docs/` 目前也不是 npm 发布目标

#### 什么时候需要写 changeset

需要写 changeset 的情况：
- SDK 对外能力有变化，比如新增功能、修复 bug、调整类型定义
- SDK 的使用方式、导出内容、默认行为发生变化

通常不需要写 changeset 的情况：
- 只改文档
- 只改示例服务端 `server/`
- 只改本地开发脚本，但不影响 npm 包 `sharding-downloader`

#### 版本号怎么选

- `patch`：修复问题、小优化，不影响现有使用方式
- `minor`：向下兼容的新功能
- `major`：有破坏性变更，升级后用户可能需要改代码

#### 日常开发时怎么管理 changeset

当你改了 SDK，并且这些改动将来要发到 npm：

```bash
# 1. 先写变更记录
pnpm change
```

执行后建议这样选：
- 包：选择 `sharding-downloader`
- 版本类型：按 `patch / minor / major` 选择
- 说明：写清楚“用户拿到这个版本后会感知到什么变化”

然后把生成出来的 `.changeset/*.md` 文件和代码一起提交。

#### 正式发版流程

当你确认这次改动准备发布时，按这个顺序执行：

```bash
# 1. 根据 changeset 更新版本号和 changelog
pnpm change-version

# 2. 先本地确认能正常构建
pnpm sdk:build
# 或
pnpm build

# 3. 发布 SDK 到 npm
pnpm sdk:publish
```

其中：
- `pnpm change-version` 会更新版本信息，并写入 changelog
- `pnpm sdk:publish` 是真正发包的命令
- 如果你想更稳一点，发版前可以先跑一遍 `pnpm build`

#### 最短记忆版

如果你只想记一套最短流程，可以直接记下面这几步：

```bash
# 开发完成后，先记录这次改动
pnpm change

# 准备发布时，更新版本号
pnpm change-version

# 检查能不能正常构建
pnpm sdk:build

# 发布到 npm
pnpm sdk:publish
```

#### 发版前自检清单

建议发版前快速确认下面几点：
- 这次改动确实影响的是 `sharding-downloader`，而不是只有 docs/server
- 对应的 `.changeset/*.md` 已经存在
- 版本类型没有选错（尤其是 `patch` / `minor` / `major`）
- 本地至少跑通了 `pnpm sdk:build`
- 已经登录 npm，并且当前账号有这个包的发布权限

#### 一句话记忆

- `pnpm change`：记录这次改了什么
- `pnpm change-version`：把记录真正写进版本号和 changelog
- `pnpm sdk:publish`：把 SDK 发到 npm

## 线上 Demo

- [CodePen 示例](https://codepen.io/moyuderen/pen/YPPvJgE)
- [文档站点](https://moyuderen.github.io/sharding-download/)

## License

MIT

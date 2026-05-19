# Quick Start

## 安装

```bash
npm i sharding-downloader
```

## 本地开发

如果你是在这个仓库里本地联调 SDK 示例页和示例服务端，先在仓库根目录安装依赖：

```bash
pnpm install
```

一键启动本地联调：

```bash
pnpm dev
```

默认会同时启动：

- SDK 示例页：`http://localhost:3201`
- 示例服务端：`http://localhost:3100`

如果你需要分别启动，也可以使用：

```bash
pnpm sdk:dev
pnpm server:dev
```

文档站点仍然单独启动：

```bash
pnpm docs:dev
```

## 使用

```javascript
import { Downloader } from 'sharding-downloader'

const downloader = new Downloader({
  action: 'https://sharding-download-server.vercel.app/api/file/download',
  chunkSize: 1024 * 1024 * 0.5,
  threads: 3
});
let downloadFileList = []

downloader.on(Callbacks.CHANGE, (file, fileList) => {
  downloadFileList = [...fileList]
});

downloader.on(Callbacks.SUCCESS, (file, fileList) => {
  console.log('Successful', file.link)
  window.open(file.link)
});

downloader.on(Callbacks.FAILED, (file, fileList) => {
  console.log("Failed !!!!!!", file, fileList);
});

downloader.on(Callbacks.PROGRESS, (file, fileList) => {
  console.log('progress', file.progress, fileList)
});

// 开始下载
const hanldeDownload = () => downloader.start('711.jpg');

// 重试
const handleRetry = (file) => file.retry();

// 暂停
const hanlePause = (file) => file.pause();

// 重新下载
const hanleResume = (file) => file.resume();
```

## 线上Demo

[sharding-download-demo](https://codepen.io/moyuderen/pen/YPPvJgE)

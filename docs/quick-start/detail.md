---
outline: deep
---

# 相关说明

## File实例

```typescript
interface File {
  id: number
  name: string // 文件名称
  size: number // 文件大小
  etag: string // 文件唯一标识，类似hash
  chunkSize: number // 分片大小
  progress: number // 0-1, 上传进度
  loadedSize: number // 已下载大小
  totalChunks: number // 总分片大小
  
  status: string // 文件状态 ready/downloadin/downloaded/success/fail
  
  url: string // obs地址
  link: string // blob本地地址
  
  start: () => void // 开始下载方法
  retry: () => void
  pause: () => void
  resume: () => void
}
```

## Chunk实例

```typescript
interface Chunk {
  index: number // chunk在文件中索引位置
  fileSize: number // 文件大小
  chunkSize: number // 分片大小
  size: number // chunk的总大小
  loaded: number // chunk在请求中已下载的大小
  progress: number // 上传进度 0-1
  stardByte: number // 分片开始的字节位置
  endByte: number // 分片结束的字节位置
  status: string // chunk状态
  
  url: string // downloader.start(url)中的url
}
```

## 状态

```js
export const FileStatus = {
  INIT: 'init',
  READY: 'ready',
  DOWNLOADING: 'downloading',
  DOWNLOADED: 'downloaded',
  CANCELLED: 'cancelled',
  SUCCESS: 'success',
  FAILED: 'failed'
}

export const ChunkStatus = {
  READY: 'ready',
  PENDING: 'pending',
  DOWNLOADING: 'downloading',
  DOWNLOADED: 'downloaded',
  ERROR: 'error'
}

```

## 后端交互

查看[Server](/server)说明

---
outline: deep
---

# 相关说明

## DownloaderOptions

```typescript
type DownloaderOptions = {
  /** IndexedDB version */
  storageVersion: number;
  /**
   * indexedDB name
   */
  storageName: string;
  /**
   * 分段下载接口
   */
  action: string;
  /** 自定义data */
  data: Record<string, any>;
  /**
   * 自定义headers
   */
  headers: Record<string, string>;
  /**
   * 分片大小，单位是bit
   */
  chunkSize: number;
  /**
   * 接口并发数
   */
  threads: number;
  /**
   * 自定义下载接口
   */
  customRequest: Function;
  /**
   * 最大自动重试次数
   */
  maxRetries: number;
  /**
   * 重试间隔时间，单位是ms
   */
  retryInterval: number;
  /**
   * 接口成功判断逻辑，返回true为接口成功
   * @param data
   * @returns
   */
  requestSucceed: (data: Blob | object) => Promise<boolean>;
  /**
   * 是否分片下载
   */
  isPart: boolean;
};
```

## UserDownloaderOptions

```typescript
type UserDownloaderOptions = Partial<DownloaderOptions>;
```

## FileItem {#file-item}

```typescript
type FileItem = {
  /** 文件id */
  id: string;
  /** 文件名称 */
  name: string;
  /** 文件大小 */
  size: number;
  /** 文件唯一标识 */
  etag: string;
  /** 文件状态 */
  status: TypeFileStatus;
  /** 下载成功后生成的前端地址 */
  link: string;
  /** 分片大小 */
  chunkSize: number;
  /** 文件obs地址，或者文件下载标识 */
  url: string;
  /** 下载接口 */
  action: string;
  /** 文件下载进度 */
  progress: number;
  /** 文件已经下载的大小（bit） */
  loadedSize: number;
  /** 分片chunk数组 */
  chunks: Chunk[];
  /** 总分片数 */
  totalChunks: number;
  /** 已经下载chunk索引值 */
  downloaded: Set<number>;
  /** 取消获取文件元信息abort */
  get renderSize(): string;
  get renderLoadedSize(): string;
  generateBlobUrl(blob: Blob): string;
  revokeBlobUrl(): void;
  cancel(): void;
  pause(): void;
  retry(): void;
  resume: () => void;
}
```

## Chunk实例

```typescript
class Chunk {
  /** chunk的索引 */
  index: number;
  /** 下载文件的Obs地址，或者下载标识 */
  url: string;
  /** 文件大小 */
  fileSize: number;
  /** 分片大小 */
  chunkSize: number;
  /** chunk所在文件流的位置起点 */
  startByte: number;
  /** chunk所在文件流的位置终点 */
  endByte: number;
  /** chunk大小 */
  size: number;
  /** chunk状态 */
  status: string;
  /** 重试次数 */
  maxRetries: number;
  /**  */
  request: any;
  /** 重试间隔计时器 */
  timer: undefined | number;
  /** 下载进度 */
  progress: number;
  /** 已下载大小 */
  loaded: number;
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

## RequestOptions

```typescript
type RequestOptions = {
  /**
   * 分片索引
   */
  index?: number;
  /** 下载接口地址 */
  action: string;
  /** 接口method类型 */
  method?: 'POST' | 'GET' | 'post' | 'get';
  /** 自定义上传参数 */
  data: {
      url: string;
      index: number;
      [key: string]: any;
  };
  /** 自定义headers */
  headers: {
      Range?: string;
      [key: string]: string | undefined;
  };
  /** 接口返回类型 */
  responseType?: XMLHttpRequestResponseType;
  /** 跨域是否支持携带凭证 */
  withCredentials?: boolean;
  /** 下载进度回调 */
  onProgress?: (e: ProgressEvent) => void;
  /** 下载成功回调 */
  onSuccess?: (response: RequestResponse) => void;
  /** 下载失败回调 */
  onFail?: (request: any, error: Error) => void;
};

```

## RequestHeaders，RequestResponse，RequestReturn {#request-info}

```typescript
type RequestHeaders = {
  'content-length': string;
  'content-range': string;
  'content-disposition': string;
  etag: string;
  [key: string]: string | undefined;
};

type RequestResponse = {
  data: Blob | object;
  status: number;
  headers: RequestHeaders;
};

type RequestReturn = {
  abort: () => void;
  canceled?: boolean;
};
```

## Request

```typescript
function request(options: RequestOptions): RequestReturn;

type Request = typeof request;
```

## 后端交互

查看[Server](/server)说明

import type { Request } from '../request'

export type DownloaderOptions = {
  /** IndexedDB version */
  storageVersion: number

  /**
   * indexedDB name
   */
  storageName: string

  /**
   * 分段下载接口
   */
  action: string

  /** 自定义data */
  data: Record<string, any>

  /**
   * 自定义headers
   */
  headers: Record<string, string>

  /**
   * 分片大小，单位是bit
   */
  chunkSize: number

  /**
   * 接口并发数
   */
  threads: number

  /**
   * 自定义下载接口
   */
  customRequest: Request

  /**
   * 最大自动重试次数
   */
  maxRetries: number

  /**
   * 重试间隔时间，单位是ms
   */
  retryInterval: number

  /**
   * 接口成功判断逻辑，返回true为接口成功
   * @param data
   * @returns
   */
  requestSucceed: (data: Blob | object) => Promise<boolean>

  /**
   * 是否分片下载
   */
  isPart: boolean
}

export type UserDownloaderOptions = Partial<DownloaderOptions>
export type FileOptions = DownloaderOptions & { url: string }

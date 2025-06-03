import { ChunkStatus } from './constants'
import { throttle } from '../helper'
import FileContext from './FileContext'
import type { FileOptions } from './typings'
import { RequestResponse } from './request'

class Chunk {
  /** chunk所在file的实例 */
  public parent: FileContext
  /** file相关配置 */
  public options: FileOptions
  /** chunk的索引 */
  public index: number
  /** 下载文件的Obs地址，或者下载标识 */
  public url: string
  /** 文件大小 */
  public fileSize: number
  /** 分片大小 */
  public chunkSize: number
  /** chunk所在文件流的位置起点 */
  public startByte: number
  /** chunk所在文件流的位置终点 */
  public endByte: number
  /** chunk大小 */
  public size: number
  /** chunk状态 */
  public status: string
  /** 重试次数 */
  public maxRetries: number
  /**  */
  public request: any
  /** 重试间隔计时器 */
  public timer: undefined | number
  /** 下载进度 */
  public progress: number
  /** 已下载大小 */
  public loaded: number

  constructor(index: number, parent: FileContext, options: FileOptions) {
    this.parent = parent
    this.options = options
    this.index = index

    this.url = options.url
    this.fileSize = parent.size
    this.chunkSize = options.chunkSize
    this.startByte = this.chunkSize * this.index
    this.endByte = Math.min(this.startByte + this.chunkSize - 1, this.fileSize - 1)
    this.size = this.endByte - this.startByte + 1
    this.status = ChunkStatus.READY
    this.maxRetries = options.maxRetries
    this.request = null
    this.timer = undefined
    this.progress = 0
    this.loaded = 0
  }

  handleProgress = throttle((e: ProgressEvent) => {
    this.loaded = e.loaded
    this.progress = Math.min(Math.max(e.loaded / e.total, this.progress), 1)
    this.status = ChunkStatus.DOWNLOADING
    this.parent._updateProgress()
  }, 200)

  async send(): Promise<Blob> {
    this.status = ChunkStatus.PENDING

    return new Promise((resolve, reject) => {
      const onFail = (e: any) => {
        if (this.request && this.request.canceled) return

        if (this.maxRetries > 0) {
          this.maxRetries--
          this.timer = setTimeout(() => {
            clearTimeout(this.timer)
            this.send()
              .then((data) => {
                resolve(data)
              })
              .catch(reject)
          }, this.options.retryInterval)
          return
        }

        this.status = ChunkStatus.ERROR
        reject(e)
      }

      const onSuccess = async ({ data }: RequestResponse) => {
        const isSuccess = await this.options.requestSucceed(data)
        if (!isSuccess) {
          return onFail(new Error('Request failed'))
        }
        this.setSuccess()
        resolve(data as Blob)
      }

      const mockError = (index: number) => {
        // const list = Math.random() > 0.5 ? [0] : []
        return ([] as number[]).includes(index)
      }

      this.request = this.options.customRequest({
        index: this.index,
        action: `${this.options.action}?index=${this.index}${mockError(this.index) ? '&error=1' : ''}`,
        data: { url: this.url, index: this.index },
        headers: {
          Range: `bytes=${this.startByte}-${this.endByte}`
        },
        onSuccess,
        onFail,
        onProgress: this.handleProgress
      })

      this.request.canceled = false
    })
  }

  cancel() {
    if (this.request) {
      this.request.canceled = true
      this.request.abort()
    }

    if (this.timer) {
      clearTimeout(this.timer)
      this.timer = undefined
    }

    this.status = ChunkStatus.ERROR
  }

  setSuccess() {
    this.status = ChunkStatus.DOWNLOADED
    this.loaded = this.size
    this.progress = 1
  }
}

export default Chunk

import Chunk from './Chunk'
import Downloader from './Downloader.js'
import Storage from './storage/Storage'
import { asyncPool, renderSize, generateUid, getFilenameFromDisposition } from '../helper'
import { FileStatus, Callbacks } from './constants'
import type { FileOptions } from './typings'
import type { TypeFileStatus } from './constants'
import type { RequestResponse } from './request'

class FileContext {
  /** 配置 */
  options: FileOptions
  /** 下载实例 */
  downloader: Downloader
  /** 存储store */
  storage: Storage
  /** 文件id */
  id: string
  /** 文件名称 */
  name: string
  /** 文件大小 */
  size: number
  /** 文件唯一标识 */
  etag: string
  /** 文件状态 */
  status: TypeFileStatus
  /** 下载成功后生成的前端地址 */
  link: string
  /** 分片大小 */
  chunkSize: number
  /** 文件obs地址，或者文件下载标识 */
  url: string
  /** 下载接口 */
  action: string
  /** 文件下载进度 */
  progress: number
  /** 文件已经下载的大小（bit） */
  loadedSize: number
  /** 分片chunk数组 */
  chunks: Chunk[]
  /** 总分片数 */
  totalChunks: number
  /** 已经下载chunk索引值 */
  downloaded: Set<number>
  /** 取消获取文件元信息abort */
  metaAbort: null | { abort: () => void }

  constructor(options: FileOptions, downloader: Downloader) {
    this.options = options
    this.downloader = downloader
    this.storage = downloader.storage

    this.id = generateUid()
    this.name = ''
    this.size = 0
    this.etag = ''
    this.status = FileStatus.INIT
    this.link = ''
    this.chunkSize = options.chunkSize
    this.action = options.action
    this.url = options.url

    this.progress = 0
    this.loadedSize = 0
    this.chunks = []
    this.totalChunks = 0
    this.downloaded = new Set()
    this.metaAbort = null

    this.start()
  }

  get renderSize() {
    return renderSize(this.size)
  }

  get renderLoadedSize() {
    return renderSize(this.loadedSize)
  }

  changeStatus(newStatus: string) {
    this.status = newStatus
    this.downloader.emit(Callbacks.CHANGE, this)
  }

  createChunks() {
    this.chunks = []
    this.totalChunks = Math.ceil(this.size / this.options.chunkSize)
    for (let i = 0; i < this.totalChunks; i++) {
      this.chunks.push(new Chunk(i, this, this.options))
    }
  }

  async getMetadata() {
    const { customRequest, action, url } = this.options
    return new Promise((resolve, reject) => {
      this.metaAbort = customRequest({
        action: `${action}?meta${false ? '&error=1' : ''}`,
        data: { url, index: -1 },
        headers: { Range: 'bytes=0-1' },
        onSuccess: async ({ headers, data }: RequestResponse) => {
          if (!(await this.options.requestSucceed(data))) {
            throw new Error('Request failed')
          }

          try {
            const name = getFilenameFromDisposition(headers['content-disposition'])
            const size = Number(headers['content-range'].split('/')[1])
            const etag = headers['etag']

            this.name = name
            this.size = size
            this.etag = etag
            resolve({ name, size, etag })
          } catch (e) {
            console.error('Error parsing response headers:', e)
            reject(new Error('Failed to parse response headers'))
          }
        },
        onFail: reject
      })
    })
  }

  async start() {
    try {
      await this.getMetadata()
      this.changeStatus(FileStatus.READY)
      this.downloader.addFile(this)
      this.options.isPart ? this.downloadPart() : this.downloadFull()
    } catch (error) {
      console.error('Error:', error)
      this.downloader.emit(Callbacks.FAILED, this)
      throw new Error('Failed to start download')
    }
  }

  async downloadPart() {
    await this.storage.cleanupExpiredChunks()
    console.log('Cleanup expired chunks success')

    this.createChunks()
    let metadata = await this.storage.getMetadata(this.etag)

    if (!metadata || metadata.totalChunks !== this.totalChunks) {
      await this.storage.cleanupFileData(this.etag)
      metadata = {
        fileId: this.etag,
        fileName: this.name,
        totalSize: this.size,
        chunkSize: this.chunkSize,
        totalChunks: this.totalChunks,
        action: this.action,
        url: this.url,
        updateAt: Date.now(),
        downloadedChunks: []
      }
      await this.storage.updateMetadata(this, [])
    }

    this.downloaded = new Set(metadata.downloadedChunks)
    this.changeStatus(FileStatus.DOWNLOADING)

    try {
      await this.downloadChunks()
      this.changeStatus(FileStatus.DOWNLOADED)
      await this.mergeFilePart()
    } catch (error: any) {
      this.changeStatus(FileStatus.FAILED)
      this.downloader.emit(Callbacks.FAILED, this)
      throw new Error(error)
    }
  }

  async downloadChunks() {
    await asyncPool(this.options.threads, this.chunks, async (chunk: Chunk) => {
      const existing = await this.storage.checkChunk(this.etag, chunk.index)
      if (this.downloaded.has(chunk.index) && existing) {
        chunk.setSuccess()
        this.updateProgress()
        return chunk
      }

      if (!this.downloaded.has(chunk.index)) {
        if (existing) {
          this.downloaded.add(chunk.index)
          await this.storage.updateMetadata(this, [...this.downloaded])
          chunk.setSuccess()
          this.updateProgress()
          return chunk
        }
      }

      const data = await chunk.send()
      await this.storage.saveChunk(this.etag, chunk.index, chunk.size, data)
      this.downloaded.add(chunk.index)
      await this.storage.updateMetadata(this, [...this.downloaded])
      return chunk
    })
  }

  async downloadFull() {
    const { customRequest, action, url } = this.options
    customRequest({
      action: action + '?full',
      data: { url, index: -2 },
      onSuccess: async ({ data }: RequestResponse) => {
        if (!(await this.options.requestSucceed(data))) {
          throw new Error('Request failed')
        }

        this.link = this.generateBlobUrl(data as Blob)
        this.progress = 1
        this.loadedSize = this.size
        this.changeStatus(FileStatus.SUCCESS)
        this.downloader.emit(Callbacks.SUCCESS, this)
      },
      onFail: () => {
        this.changeStatus(FileStatus.FAILED)
        this.downloader.emit(Callbacks.FAILED, this)
      },
      onProgress: (e: ProgressEvent) => {
        this.progress = e.loaded / e.total
        this.loadedSize = e.loaded
        this.changeStatus(FileStatus.DOWNLOADING)
        this.downloader.emit(Callbacks.PROGRESS, this)
      }
    })
  }

  updateProgress() {
    const { loadedSize, progress } = this.chunks.reduce(
      ({ loadedSize, progress }, chunk) => ({
        loadedSize: loadedSize + chunk.loaded,
        progress: progress + chunk.progress * (chunk.size / this.size)
      }),
      { loadedSize: 0, progress: 0 }
    )

    this.progress = Math.min(1, Math.max(progress, this.progress))
    this.loadedSize = Math.min(this.size, Math.max(loadedSize, this.loadedSize))
    this.changeStatus(FileStatus.DOWNLOADING)
    this.downloader.emit(Callbacks.PROGRESS, this)
  }

  async mergeFilePart() {
    this.progress = 1
    this.loadedSize = this.size
    const chunks = await this.storage.getChunks(this.etag)
    chunks.sort((a, b) => a.chunkIndex - b.chunkIndex)
    // console.log(`${this.name} AllChunks: `, chunks, this)
    const blob = new Blob(
      chunks.map((chunk) => chunk.data),
      { type: chunks[0].data.type || 'application/octet-stream' }
    )

    this.link = this.generateBlobUrl(blob)
    this.changeStatus(FileStatus.SUCCESS)
    this.downloader.emit(Callbacks.SUCCESS, this)
    this.storage.cleanupFileData(this.etag)

    chunks.length = 0
  }

  generateBlobUrl(blob: Blob) {
    return window.URL.createObjectURL(blob)
  }

  revokeBlobUrl() {
    window.URL.revokeObjectURL(this.link)
  }

  cancel() {
    this.changeStatus(FileStatus.CANCELLED)
    this.downloader.emit(Callbacks.CANCELLED, this)
    this.chunks.forEach((chunk) => {
      chunk.cancel()
    })
  }

  pause() {
    this.cancel()
  }

  retry() {
    if (this.status === FileStatus.FAILED) {
      this.start()
    }
  }

  resume = () => {
    if (this.status === FileStatus.CANCELLED) {
      if (this.metaAbort) {
        this.metaAbort.abort()
      }
      this.start()
    }
  }
}

export default FileContext

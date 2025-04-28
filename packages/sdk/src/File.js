import Chunk from './Chunk'
import Storage from './storage/Storage.js'
import { asyncPool, renderSize, generateUid, getFilenameFromDisposition } from './utils'
import { FileStatus, Callbacks } from './constants.js'

class File {
  constructor(options, downloader) {
    this.options = options
    this.downloader = downloader
    this.storage = new Storage()

    this.id = generateUid()
    this.name = ''
    this.size = ''
    this.etag = ''
    this.status = FileStatus.Init
    this.link = ''

    this.progress = 0
    this.loadedSize = 0
    this.chunks = []
    this.totalChunks = 0
    this.downloaded = new Set()

    this.start()
  }

  get renderSize() {
    return renderSize(this.size)
  }

  get renderLoadedSize() {
    return renderSize(this.loadedSize)
  }

  changeStatus(newStatus) {
    this.status = newStatus
    this.downloader.emit(Callbacks.Change, this)
  }

  createChunks() {
    this.totalChunks = Math.ceil(this.size / this.options.chunkSize)
    for (let i = 0; i < this.totalChunks; i++) {
      this.chunks.push(new Chunk(i, this, this.options))
    }
  }

  async getMetadata() {
    const request = this.options.request
    return new Promise((resolve, reject) => {
      request({
        action: this.options.action + '?meta',
        data: {
          url: this.options.url,
          index: -1
        },
        headers: {
          Range: `bytes=0-1`
        },
        onSuccess: async ({ headers, data }) => {
          const isSuccess = await this.options.requestSucceed(data)
          if (!isSuccess) {
            reject(new Error('Request failed'))
            return
          }

          try {
            const name = getFilenameFromDisposition(headers['content-disposition'] || '')
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
        onFail: (e) => {
          reject(e)
        }
      })
    })
  }

  async start() {
    try {
      await this.getMetadata()
    } catch {
      this.downloader.emit(Callbacks.Fail, this)
      return
    }
    this.changeStatus(FileStatus.Ready)
    this.downloader.addFile(this)
    this.options.isPart ? this.downloadPart() : this.downloadFull()
  }

  async downloadPart() {
    await this.storage.cleanupExpiredChunks()
    console.log('Cleanup expired chunks success')

    this.createChunks()
    let metadata = await this.storage.getMetadata(this.etag)

    if (!metadata) {
      metadata = { downloadedChunks: [] }
      await this.storage.updateMetadata(this, [])
    } else {
      if (metadata.totalChunks !== this.totalChunks) {
        await this.storage.cleanupFileData(this.etag)
        metadata = { downloadedChunks: [] }
        await this.storage.updateMetadata(this, [])
      }
    }

    this.downloaded = new Set(metadata.downloadedChunks)
    this.changeStatus(FileStatus.Downloading)

    try {
      await asyncPool(this.options.threads, this.chunks, async (chunk) => {
        const existing = await this.storage.checkChunk(this.etag, chunk.index)

        if (this.downloaded.has(chunk.index) && existing) {
          chunk.changeSuccess()
          this.updateProgress()
          return chunk
        }

        if (!this.downloaded.has(chunk.index)) {
          if (existing) {
            this.downloaded.add(chunk.index)
            await this.storage.updateMetadata(this, [...this.downloaded])
            chunk.changeSuccess()
            this.updateProgress()
            return chunk
          }
        }

        let data
        try {
          data = await chunk.send()
          await this.storage.saveChunk(this.etag, chunk.index, chunk.size, data)
          this.downloaded.add(chunk.index)
          await this.storage.updateMetadata(this, [...this.downloaded])
          data = null
          return chunk
        } catch (error) {
          data = null
          throw new Error(error)
        }
      })
      this.changeStatus(FileStatus.Downloaded)
      this.mergeFilePart()
    } catch (error) {
      this.changeStatus(FileStatus.Fail)
      this.downloader.emit(Callbacks.Fail, this)
      if (this.options.cleaupFailed) {
        this.storage.cleanupFileData(this.etag)
      }
      throw new Error(error)
    }
  }
  async downloadFull() {
    const request = this.options.request
    request({
      action: this.options.action + '?full',
      data: { url: this.options.url, index: -2 },
      onSuccess: async ({ data }) => {
        const isSuccess = await this.options.requestSucceed(data)
        if (!isSuccess) {
          this.emit(Callbacks.Error)
          return
        }

        this.link = this.generateBlobUrl(data)
        this.progress = 1
        this.loadedSize = this.size
        this.changeStatus(FileStatus.Success)
        this.downloader.emit(Callbacks.Success, this)
      },
      onFail: () => {
        this.changeStatus(FileStatus.Fail)
        this.downloader.emit(Callbacks.Error, this)
      },
      onProgress: (e) => {
        this.progress = e.loaded / e.total
        this.loadedSize = e.loaded
        this.changeStatus(FileStatus.Downloading)
        this.downloader.emit(Callbacks.Progress, this, this.fileList)
      }
    })
  }

  updateProgress() {
    const progressInfo = this.chunks.reduce(
      (info, chunk) => {
        info.progress += chunk.progress * (chunk.size / this.size)
        info.loadedSize += chunk.loaded
        return info
      },
      {
        loadedSize: 0,
        progress: 0
      }
    )

    const { loadedSize, progress } = progressInfo
    this.progress = Math.min(1, progress)
    this.loadedSize = Math.min(this.size, loadedSize)
    this.changeStatus(FileStatus.Downloading)
    this.downloader.emit(Callbacks.Progress, this)
  }

  async mergeFilePart() {
    this.progress = 1
    this.loadedSize = this.size
    let chunks = await this.storage.getChunks(this.etag)
    chunks.sort((a, b) => a.chunkIndex - b.chunkIndex)
    console.log(`${this.name} AllChunks: `, chunks, this)
    const blob = new Blob(
      chunks.map((chunk) => chunk.data),
      { type: chunks[0].data.type }
    )

    this.link = this.generateBlobUrl(blob)
    this.changeStatus(FileStatus.Success)
    this.downloader.emit(Callbacks.Success, this)
    this.storage.cleanupFileData(this.etag)
    chunks = []
  }

  generateBlobUrl(blob) {
    const blobUrl = window.URL.createObjectURL(blob)
    const timer = setTimeout(() => {
      clearTimeout(timer)
      window.URL.revokeObjectURL(blobUrl)
    }, 1000)
    return blobUrl
  }

  cancel() {
    this.changeStatus(FileStatus.Cancelled)
    this.downloader.emit(Callbacks.Fail, this)
    this.chunks.forEach((chunk) => {
      chunk.cancel()
    })
  }
}

export default File

import Chunk from './Chunk'
import { asyncPool } from './utils'
import { FileStatus, Callbacks } from './constants.js'

class File {
  constructor(options, downloader) {
    this.options = options
    this.downloader = downloader
    this.id = options.id
    this.storage = options.storage
    this.name = options.name
    this.size = options.size
    this.etag = options.etag
    this.chunkSize = options.chunkSize
    this.threads = options.threads
    this.changeStatus(FileStatus.Ready)
    this.action = options.action
    this.url = options.url
    this.link = ''

    this.progress = 0
    this.chunks = []
    this.totalChunks = 0
    this.downloaded = new Set()

    this.createChunks()
  }

  changeStatus(newStatus) {
    this.status = newStatus
    this.downloader.emit(Callbacks.Change, this)
  }

  async start() {
    try {
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

      await asyncPool(this.threads, this.chunks, async (chunk) => {
        const existing = await this.storage.checkChunk(this.etag, chunk.index)

        if (this.downloaded.has(chunk.index) && existing) {
          this.updateProgress()
          return chunk
        }

        if (!this.downloaded.has(chunk.index)) {
          if (existing) {
            this.downloaded.add(chunk.index)
            await this.storage.updateMetadata(this, [...this.downloaded])
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
          this.updateProgress()
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
      throw new Error(error)
    }
  }

  updateProgress() {
    this.progress = this.downloaded.size / this.totalChunks
    this.changeStatus(FileStatus.Downloading)
    this.downloader.emit(Callbacks.Progress, this)
  }

  async mergeFilePart() {
    this.updateProgress()
    let chunks = await this.storage.getChunks(this.etag)
    chunks.sort((a, b) => a.chunkIndex - b.chunkIndex)
    console.log(`${this.name} AllChunks: `, chunks, this)
    const blob = new Blob(
      chunks.map((chunk) => chunk.data),
      { type: chunks[0].data.type }
    )
    chunks = []
    const url = URL.createObjectURL(blob)
    this.link = url
    this.changeStatus(FileStatus.Success)
    this.downloader.emit(Callbacks.Success, this)
    this.storage.cleanupFileData(this.etag)
  }

  createChunks() {
    this.totalChunks = Math.ceil(this.size / this.chunkSize)
    for (let i = 0; i < this.totalChunks; i++) {
      this.chunks.push(
        new Chunk({
          index: i,
          fileSize: this.size,
          chunkSize: this.chunkSize,
          action: this.action,
          url: this.url,
          customRequest: this.downloader.request,
          maxRetries: this.downloader.options.maxRetries,
          retryInterval: this.downloader.options.retryInterval,
          requestSucceed: this.downloader.options.requestSucceed
        })
      )
    }
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

import Chunk from './Chunk'
import { asyncPool, renderSize } from './utils'
import { FileStatus, Callbacks } from './constants.js'

class File {
  constructor(options, downloader) {
    this.options = options
    this.downloader = downloader

    this.id = options.id
    this.storage = downloader.storage
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
    this.loadedSize = 0
    this.chunks = []
    this.totalChunks = 0
    this.downloaded = new Set()

    this.createChunks()
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
          chunk.changeSuccess()
          this.updateProgress(1, chunk)
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
    chunks = []
    const url = window.URL.createObjectURL(blob)
    this.link = url
    this.changeStatus(FileStatus.Success)
    this.downloader.emit(Callbacks.Success, this)
    this.storage.cleanupFileData(this.etag)
    const timer = setTimeout(() => {
      clearTimeout(timer)
      window.URL.revokeObjectURL(url)
    }, 1000)
  }

  createChunks() {
    this.totalChunks = Math.ceil(this.size / this.chunkSize)
    for (let i = 0; i < this.totalChunks; i++) {
      this.chunks.push(new Chunk(i, this, this.options))
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

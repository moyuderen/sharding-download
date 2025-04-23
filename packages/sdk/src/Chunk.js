import { ChunkStatus } from './constants.js'

class Chunk {
  constructor(index, parent, options) {
    this.index = index
    this.parent = parent
    this.options = options

    this.action = options.action
    this.url = options.url
    this.fileSize = parent.size
    this.chunkSize = options.chunkSize
    this.stardByte = this.chunkSize * this.index
    this.endByte = Math.min(this.stardByte + this.chunkSize - 1, this.fileSize - 1)
    this.size = this.endByte - this.stardByte
    this.status = ChunkStatus.Ready
    this.maxRetries = options.maxRetries
    this.retryInterval = options.retryInterval
    this.customRequest = options.customRequest
    this.requestSucceed = options.requestSucceed
    this.request = null
    this.timer = null
    this.progress = 0
  }

  async send() {
    this.status = ChunkStatus.Pending
    const onFail = (e, reject) => {
      if (this.request.canceled) {
        return
      }

      if (this.maxRetries > 0) {
        this.maxRetries--
        this.timer = setTimeout(async () => {
          clearTimeout(this.timer)
          try {
            await this.send()
          } catch (error) {
            reject(error)
          }
        }, this.retryInterval)
        return
      }

      this.status = ChunkStatus.Error
      reject(e)
    }
    return new Promise((resolve, reject) => {
      this.request = this.customRequest({
        action: this.action + '?index=' + this.index,
        data: { url: this.url, index: this.index },
        headers: {
          Range: `bytes=${this.stardByte}-${this.endByte}`
        },
        onSuccess: async ({ data }) => {
          const isSuccess = await this.requestSucceed(data)
          if (!isSuccess) {
            onFail(new Error('Request failed'), reject)
            return
          }
          this.status = ChunkStatus.Downloaded
          resolve(data)
        },
        onFail: (e) => onFail(e, reject),
        onProgress: (e) => {
          this.progress = Math.min(Math.max(e.loaded / e.total, this.progress), 1)
          this.parent.updateProgress()
          this.status = ChunkStatus.Downloading
        }
      })

      this.request.canceled = false
    })
  }

  cancel() {
    this.status = ChunkStatus.Error
    if (this.request) {
      this.request.canceled = true
      this.request.abort()
      // this.request = null
    }

    if (this.timer) {
      clearTimeout(this.timer)
      this.timer = null
    }
  }
}

export default Chunk

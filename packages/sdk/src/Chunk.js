import { ChunkStatus } from './constants.js'
import { throttle } from './utils.js'

class Chunk {
  constructor(index, parent, options) {
    this.index = index
    this.parent = parent
    this.options = options

    this.url = options.url
    this.fileSize = parent.size
    this.chunkSize = options.chunkSize
    this.stardByte = this.chunkSize * this.index
    this.endByte = Math.min(this.stardByte + this.chunkSize - 1, this.fileSize - 1)
    this.size = this.endByte - this.stardByte
    this.status = ChunkStatus.Ready
    this.maxRetries = options.maxRetries
    this.request = null
    this.timer = null
    this.progress = 0
    this.loaded = 0
  }

  progressleHandle(e) {
    const updateProgress = (e) => {
      this.loaded = e.loaded
      this.progress = Math.min(Math.max(e.loaded / e.total, this.progress), 1)
      this.parent.updateProgress()
      this.status = ChunkStatus.Downloading
    }
    return throttle(() => updateProgress(e), 10000)
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
        }, this.options.retryInterval)
        return
      }

      this.status = ChunkStatus.Error
      reject(e)
    }
    return new Promise((resolve, reject) => {
      const updateProgress = (e) => {
        this.loaded = e.loaded
        this.progress = Math.min(Math.max(e.loaded / e.total, this.progress), 1)
        this.parent.updateProgress()
        this.status = ChunkStatus.Downloading
      }
      const progressleHandle = throttle(updateProgress, 200)
      this.request = this.options.request({
        index: this.index,
        action: this.options.action + '?index=' + this.index,
        data: { url: this.url, index: this.index },
        headers: {
          Range: `bytes=${this.stardByte}-${this.endByte}`
        },
        onSuccess: async ({ data }) => {
          const isSuccess = await this.options.requestSucceed(data)
          if (!isSuccess) {
            onFail(new Error('Request failed'), reject)
            return
          }
          this.changeSuccess()
          resolve(data)
        },
        onFail: (e) => onFail(e, reject),
        onProgress: (e) => {
          progressleHandle(e)
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

  changeSuccess() {
    this.status = ChunkStatus.Downloaded
    this.loaded = this.size
    this.progress = 1
  }
}

export default Chunk

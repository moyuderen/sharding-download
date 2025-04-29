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
    this.startByte = this.chunkSize * this.index
    this.endByte = Math.min(this.startByte + this.chunkSize - 1, this.fileSize - 1)
    this.size = this.endByte - this.startByte + 1
    this.status = ChunkStatus.READY
    this.maxRetries = options.maxRetries
    this.request = null
    this.timer = null
    this.progress = 0
    this.loaded = 0
  }

  handleProgress = throttle((e) => {
    this.loaded = e.loaded
    this.progress = Math.min(Math.max(e.loaded / e.total, this.progress), 1)
    this.status = ChunkStatus.DOWNLOADING
    this.parent.updateProgress()
  }, 200)

  async send() {
    this.status = ChunkStatus.PENDING

    return new Promise((resolve, reject) => {
      const onFail = (e) => {
        if (this.request && this.request.canceled) return

        if (this.maxRetries > 0) {
          this.maxRetries--
          this.timer = setTimeout(() => {
            clearTimeout(this.timer)
            this.send()
              .then(({ data }) => resolve(data))
              .catch(reject)
          }, this.options.retryInterval)
          return
        }

        this.status = ChunkStatus.ERROR
        reject(e)
      }

      const mockError = (index) => {
        return [].includes(index)
      }

      this.request = this.options.request({
        index: this.index,
        action: `${this.options.action}?index=${this.index}${mockError(this.index) ? '&error=1' : ''}`,
        data: { url: this.url, index: this.index },
        headers: {
          Range: `bytes=${this.startByte}-${this.endByte}`
        },
        onSuccess: async ({ data }) => {
          const isSuccess = await this.options.requestSucceed(data)
          if (!isSuccess) {
            return onFail(new Error('Request failed'))
          }
          this.setSuccess()
          resolve(data)
        },
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
      this.timer = null
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

import request from './request.js'
import File from './File.js'
import Event from './Event.js'
import { getBody } from './utils.js'
import { Callbacks } from './constants.js'

const defaultsConfig = {
  action: '',
  chunkSize: 1024 * 1024 * 2,
  threads: 6,
  customRequest: null,
  maxRetries: 3,
  retryInterval: 500,
  requestSucceed: async (data) => {
    const body = await getBody(data)
    if (body.code && body.code !== '00000') {
      return false
    }
    return true
  },
  isPart: true
}

class Downloader {
  constructor(options) {
    this.options = Object.assign(defaultsConfig, options)
    this.options.request = this.options.customRequest || request
    this.event = new Event()
    this.fileList = []
  }

  on(name, fn) {
    this.event.on(name, fn)
  }

  emit(name, ...args) {
    this.event.emit(name, ...args, this.fileList)
  }

  async start(url) {
    if (typeof url !== 'string' || !url.trim()) {
      this.emit(Callbacks.FAILED, null, this.fileList)
      throw new Error('A valid URL is required')
    }

    if (!this.options.customRequest && !this.options.action) {
      throw new Error('Config action is required')
    }

    const tryCreateFile = () => new File({ ...this.options, url }, this)
    tryCreateFile()
  }

  addFile(file) {
    if (!this.fileList.some((f) => f.id === file.id)) {
      this.fileList.push(file)
    }
  }
}

export default Downloader

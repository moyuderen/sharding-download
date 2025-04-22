import request from './request.js'
import File from './File.js'
import Storage from './storage/Storage.js'
import Event from './Event.js'
import { getBody } from './utils.js'
import { Callbacks, FileStatus } from './constants.js'

let id = 0
const defaultsConfig = {
  action: '',
  chunkSize: 1024 * 1024 * 2,
  threads: 6,
  customRequest: request,
  maxRetries: 3,
  retryInterval: 1000,
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
    this.action = this.options.action
    this.chunkSize = this.options.chunkSize
    this.threads = this.options.threads
    this.clearSameName = this.options.clearSameName
    this.request = this.options.customRequest
    this.isPart = this.options.isPart
    this.downloadingChunks = new Set()
    this.fileList = []
    this.storage = new Storage()
    this.event = new Event()
  }

  on(name, fn) {
    this.event.on(name, fn)
  }

  emit(name, ...args) {
    this.event.emit(name, ...args, this.fileList)
  }

  async start(url) {
    if (!url || !this.action) {
      throw new Error('url or action is required')
    }

    this.isPart ? this.partDownload(url) : this.fullDownload(url)
  }

  fullDownload(url) {
    const file = {
      id: id++,
      name: '',
      status: FileStatus.Ready
    }

    const changeStatus = (status) => {
      file.status = status
      this.emit(Callbacks.Change, file, this.fileList)
    }

    changeStatus(FileStatus.Ready)
    this.fileList.push(file)

    this.request({
      action: this.action,
      data: { url, index: -2 },
      onSuccess: async ({ data, headers }) => {
        const isSuccess = await this.options.requestSucceed(data)
        if (!isSuccess) {
          this.emit(Callbacks.Error)
          return
        }
        const contentDisposition = headers['Content-Disposition']
        const index = contentDisposition.lastIndexOf("'")
        const url = URL.createObjectURL(data)
        file.name = contentDisposition.substr(index + 1)
        file.link = url
        this.emit(Callbacks.Success, file, this.fileList)
        changeStatus(FileStatus.Success)
      },
      onFail: () => {
        this.emit(Callbacks.Error, file, this.fileList)
        changeStatus(FileStatus.Fail)
      },
      onProgress: (e) => {
        file.progress = e.loaded / e.total
        this.emit(Callbacks.Progress, file, this.fileList)
        changeStatus(FileStatus.Downloading)
      }
    })
  }

  async partDownload(url) {
    await this.storage.cleanupExpiredChunks()
    console.log('Cleanup expired chunks success')

    this.creatFile(url)
  }

  async getMeta(url) {
    return new Promise((resolve, reject) => {
      this.request({
        action: this.action,
        data: { url, index: -1 },
        headers: {
          Range: `bytes=0-1`
        },
        onSuccess: async ({ headers, data }) => {
          const isSuccess = await this.options.requestSucceed(data)
          if (!isSuccess) {
            reject(new Error('Request failed'))
            return
          }
          const contentDisposition = headers['Content-Disposition']
          const index = contentDisposition.lastIndexOf("'")
          const name = contentDisposition.substr(index + 1)
          const size = Number(headers['Content-Range'].split('/')[1])
          const etag = headers['Etag']
          resolve({ name, size, etag })
        },
        onFail: (e) => {
          reject(e)
        }
      })
    })
  }

  async creatFile(url) {
    const { name, size, etag } = await this.getMeta(url)
    const file = new File(
      {
        id: id++,
        name,
        size,
        etag,
        chunkSize: this.chunkSize,
        threads: this.threads,
        action: this.action,
        storage: this.storage,
        url
      },
      this
    )

    this.fileList.push(file)
    file.start()
  }
}

export default Downloader

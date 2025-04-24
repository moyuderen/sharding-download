import request from './request.js'
import File from './File.js'
import Storage from './storage/Storage.js'
import Event from './Event.js'
import { getBody, getFilenameFromDisposition } from './utils.js'
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
  isPart: true,
  cleaupFailed: false
}

class Downloader {
  constructor(options) {
    this.options = Object.assign(defaultsConfig, options)
    this.action = this.options.action
    this.chunkSize = this.options.chunkSize
    this.threads = this.options.threads
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
      this.emit(Callbacks.Fail, null, this.fileList)
      throw new Error('url or action is required')
    }

    this.isPart ? this.partDownload(url) : this.fullDownload(url)
  }

  async fullDownload(url) {
    let file
    const changeStatus = (status) => {
      file.status = status
      this.emit(Callbacks.Change, file, this.fileList)
    }

    try {
      const { name, size } = await this.getMeta(url)
      file = {
        id: id++,
        name,
        size,
        progress: 0,
        status: FileStatus.Ready
      }

      changeStatus(FileStatus.Ready)
      this.fileList.push(file)
    } catch (error) {
      console.error('Error getting file metadata:', error)
      this.emit(Callbacks.Fail, null, this.fileList)
    }

    this.request({
      action: this.action,
      data: { url, index: -2 },
      onSuccess: async ({ data, headers }) => {
        const isSuccess = await this.options.requestSucceed(data)
        if (!isSuccess) {
          this.emit(Callbacks.Error)
          return
        }
        file.name = getFilenameFromDisposition(headers['content-disposition'])
        file.link = URL.createObjectURL(data)
        file.progress = 1
        file.loadedSize = file.size
        this.emit(Callbacks.Success, file, this.fileList)
        changeStatus(FileStatus.Success)
      },
      onFail: () => {
        this.emit(Callbacks.Error, file, this.fileList)
        changeStatus(FileStatus.Fail)
      },
      onProgress: (e) => {
        file.progress = e.loaded / e.total
        file.loadedSize = e.loaded
        file.size = e.total
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

          try {
            const name = getFilenameFromDisposition(headers['content-disposition'] || '')
            const size = Number(headers['content-range'].split('/')[1])
            const etag = headers['etag']
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

  async creatFile(url) {
    try {
      const { name, size, etag } = await this.getMeta(url)
      const file = new File(
        {
          ...this.options,
          id: id++,
          name,
          size,
          etag,
          url
        },
        this
      )

      this.fileList.push(file)
      file.start()
    } catch (e) {
      console.error('Error getting file metadata:', e)
      this.emit(Callbacks.Fail, null, this.fileList)
    }
  }
}

export default Downloader

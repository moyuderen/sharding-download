import request from './request'
import FileContext from './FileContext'
import Event from './Event'
import Storage from './storage/Storage'
import { getBody } from '../helper'
import { Callbacks } from './constants'

import type { DownloaderOptions, UserDownloaderOptions } from './typings'

const defaultsConfig: DownloaderOptions = {
  storageVersion: 1,
  storageName: 'file_chunks_db',
  action: '',
  chunkSize: 1024 * 1024 * 2,
  threads: 6,
  customRequest: request,
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
  public options: DownloaderOptions
  private event: Event
  public storage: Storage
  public fileList: FileContext[]

  constructor(options: UserDownloaderOptions) {
    this.options = Object.assign(defaultsConfig, options)
    this.event = new Event()
    this.storage = new Storage(this.options.storageVersion, this.options.storageName)
    this.fileList = []
  }

  public on(name: string, fn: Function) {
    this.event.on(name, fn)
  }

  public emit(name: string, ...args: any[]) {
    this.event.emit(name, ...args, this.fileList)
  }

  setOption(options: UserDownloaderOptions) {
    this.options = Object.assign(this.options, options)
    this.storage = new Storage(options.storageVersion, options.storageName)
  }

  async start(url: string) {
    if (typeof url !== 'string' || !url.trim()) {
      this.emit(Callbacks.FAILED, null, this.fileList)
      throw new Error('A valid URL is required')
    }

    if (!this.options.customRequest && !this.options.action) {
      throw new Error('Config action is required')
    }

    const tryCreateFile = () => new FileContext({ ...this.options, url }, this)
    tryCreateFile()
  }

  _addFile(file: FileContext) {
    if (!this.fileList.some((f) => f.id === file.id)) {
      this.fileList.push(file)
    }
  }
}

export default Downloader

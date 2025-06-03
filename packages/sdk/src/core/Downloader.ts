import FileContext from './FileContext'
import Event from './Event'
import Storage from './storage/Storage'
import { Callbacks, defaultsConfig } from './constants'
import type { DownloaderOptions, UserDownloaderOptions } from './typings'
import { deepAssign } from '../helper'

class Downloader {
  public options: DownloaderOptions
  private event: Event
  public storage: Storage
  public fileList: FileContext[]

  constructor(options: UserDownloaderOptions) {
    this.options = deepAssign(defaultsConfig, options)
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
    this.options = deepAssign(this.options, options)
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

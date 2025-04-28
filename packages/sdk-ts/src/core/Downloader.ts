import Event, { Func } from './Event.ts'
import File from './File.ts'
import { DefaultOptions } from './defaults.ts'
import type { Request } from './request.ts'

export type DownloaderOptions = {
  action?: string
  chunkSize?: number
  isPart?: boolean
  threads?: number
  maxRetries?: number
  retryInterval?: number
  requestSucceed?: (response: any) => boolean
  customRequest?: Request
}

export default class Downloader {
  public options: Required<DownloaderOptions>
  private event: Event
  public fileList: File[]

  constructor(optons: DownloaderOptions) {
    this.options = Object.assign(DefaultOptions, optons)
    this.event = new Event()
    this.fileList = []
  }

  on(name: string, func: Func) {
    this.event.on(name, func)
  }

  emit(name: string, ...args: any[]) {
    this.event.emit(name, ...args, this.fileList)
  }

  start(url: string) {
    if (!url) {
      console.error('Url is required !')
    }

    new File(this, url)
  }

  addFile(file: File) {
    this.fileList.push(file)
  }
}

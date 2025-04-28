import Chunk from './Chunk.ts'
import Storage from './storage/Storage.ts'
import Downloader, { DownloaderOptions } from './Downloader.ts'
import { generateUid, getFilenameFromDisposition } from '../helper/index.ts'
import { request } from './request.ts'

export enum FileStatus {
  Init = 'init',
  Ready = 'ready',
  Downloading = 'downloading',
  Downloaded = 'downloaded',
  Success = 'success',
  Failed = 'failed'
}

export enum Callback {
  Change = 'change'
}

export default class File {
  public parent: Downloader
  public options: Required<DownloaderOptions>
  public id: string
  /**下载的obs地址 */
  public url: string
  public name: string
  public etag: string
  public size: number
  public progress: number
  public loaded: number
  public link: string
  public status: FileStatus

  public storage: Storage
  public chunks: Chunk[]
  public totalChunks: number
  public downloaed: Set<number>

  constructor(parent: Downloader, url: string) {
    this.parent = parent
    this.options = parent.options
    this.url = url
    this.id = generateUid()
    this.name = ''
    this.etag = ''
    this.size = 0
    this.progress = 0
    this.loaded = 0
    this.link = ''
    this.status = FileStatus.Init

    this.storage = new Storage()
    this.chunks = []
    this.totalChunks = 0
    this.downloaed = new Set()

    this.start()
  }

  changeStatus(newStatus: FileStatus) {
    this.status = newStatus
    this.parent.emit(Callback.Change, this)
  }

  async start() {
    this.changeStatus(FileStatus.Ready)
    try {
      await this.getMeta()
      this.parent.addFile(this)
    } catch (error) {
      console.error(error)
      throw new Error('Get meta failed')
    }
    this.createChunks()
  }

  async getMeta() {
    const customRequest = this.options.customRequest || request
    return new Promise((resolve, reject) => {
      customRequest({
        action: this.options.action + '?meta',
        data: {
          url: this.url
        },
        headers: {
          Range: `bytes=0-1`
        },
        onSuccess: ({ headers }) => {
          this.name = getFilenameFromDisposition(headers['content-disposition'])
          this.size = Number(headers['content-range'].split('/')[1])
          this.etag = headers['etag']
          resolve(true)
        },
        onFailed: (error: any) => {
          reject(error)
        }
      })
    })
  }

  createChunks() {
    this.totalChunks = Math.ceil(this.size / this.options.chunkSize)
    for (let i = 0; i < this.totalChunks; i++) {
      this.chunks.push(new Chunk())
    }
  }

  async download() {}
}

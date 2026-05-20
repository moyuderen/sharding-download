import { supportsIndexedDB } from '../../helper'
import MemoryStorage from './MemoryStorage'
import IndexedDBWrapper from './DBStorage'
import FileContext from '../FileContext'

export type FileMetadata = {
  fileId: string
  fileName: string
  totalSize: number
  chunkSize: number
  totalChunks: number
  action: string
  url: string
  downloadedChunks: number[]
  updateAt: number
}

export type StorageChunk = {
  fileId: string
  chunkIndex: number
  chunkSize: number
  data: Blob
  updateAt: number
}

export interface IStorage {
  checkChunk(fileId: string, chunkIndex: number): Promise<boolean>
  saveChunk(fileId: string, chunkIndex: number, chunkSize: number, chunkData: Blob): Promise<StorageChunk>
  updateMetadata(file: FileContext, downloadedChunks: number[]): Promise<void>
  getMetadata(fileId: string): Promise<FileMetadata | null>
  getChunks(fileId: string): Promise<StorageChunk[]>
  cleanupFileData(fileId: string): Promise<boolean>
  cleanupExpiredChunks(): Promise<boolean>
  close(): void
}

export function buildMetadata(file: FileContext, downloadedChunks: number[]): FileMetadata {
  return {
    fileId: file.etag,
    fileName: file.name,
    totalSize: file.size,
    chunkSize: file.chunkSize,
    totalChunks: file.totalChunks,
    action: file.action,
    url: file.url,
    downloadedChunks,
    updateAt: Date.now()
  }
}

export default class DBWrapper {
  private _store: IStorage
  type: 'IndexedDB' | 'Memory'
  version: number
  name: string

  constructor(version = 1, dbName = 'file_chunks_db') {
    this.version = version
    this.name = dbName
    this._store = supportsIndexedDB ? new IndexedDBWrapper(version, dbName) : new MemoryStorage()
    this.type = supportsIndexedDB ? 'IndexedDB' : 'Memory'
  }

  async checkChunk(fileId: string, chunkIndex: number) {
    return this._store.checkChunk(fileId, chunkIndex)
  }

  async saveChunk(fileId: string, chunkIndex: number, chunkSize: number, chunkData: Blob) {
    return this._store.saveChunk(fileId, chunkIndex, chunkSize, chunkData)
  }

  async updateMetadata(file: FileContext, downloadedChunks: number[]) {
    return this._store.updateMetadata(file, downloadedChunks)
  }

  async getMetadata(fileId: string) {
    return this._store.getMetadata(fileId)
  }

  async getChunks(fileId: string) {
    return this._store.getChunks(fileId)
  }

  async cleanupFileData(fileId: string) {
    return this._store.cleanupFileData(fileId)
  }

  async cleanupExpiredChunks() {
    return this._store.cleanupExpiredChunks()
  }

  close() {
    this._store.close()
  }
}

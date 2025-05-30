import { isSupportIndexedDB } from '../../helper'
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

export default class DBWrapper {
  public _store: IndexedDBWrapper | MemoryStorage
  type: 'IndexedDB' | 'Memory'

  constructor(version = 1, dbName = 'file_chunks_db') {
    this._store = isSupportIndexedDB ? new IndexedDBWrapper(version, dbName) : new MemoryStorage()
    this.type = isSupportIndexedDB ? 'IndexedDB' : 'Memory'
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
    if (this._store) {
      this._store.close()
    }
  }
}

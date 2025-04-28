import { isSupportIndexedDB } from '../../helper'
import DBStorage from './DBStorage'
import MemoryStorage from './MemoryStorage'
import File from '../File'

export default class Storage {
  public version: number
  public _store: DBStorage | MemoryStorage

  constructor(version = 1) {
    this.version = version
    this._store = isSupportIndexedDB ? new DBStorage(version) : new MemoryStorage()
  }

  async checkChunk(fileId: string, chunkIndex: number) {
    return this._store.checkChunk(fileId, chunkIndex)
  }

  async saveChunk(fileId: string, chunkIndex: number, chunkSize: number, chunkData: Blob) {
    return this._store.saveChunk(fileId, chunkIndex, chunkSize, chunkData)
  }

  async updateMetadata(file: File, downloadedChunks: number[]) {
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

  async cleanupExpiredChunks(fileId: string) {
    return this._store.cleanupExpiredChunks(fileId)
  }

  close() {
    if (this._store) {
      this._store.close()
    }
  }
}

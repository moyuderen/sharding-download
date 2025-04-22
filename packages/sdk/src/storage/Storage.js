import { isSupportIndexedDB } from '../utils.js'
import MemoryStorage from './MemoryStorage.js'
import DBStorage from './DBStorage.js'

export default class DBWrapper {
  constructor(version = 1) {
    this._store = isSupportIndexedDB ? new DBStorage(version) : new MemoryStorage()
  }

  async checkChunk(fileId, chunkIndex) {
    return this._store.checkChunk(fileId, chunkIndex)
  }

  async saveChunk(fileId, chunkIndex, chunkSize, chunkData) {
    return this._store.saveChunk(fileId, chunkIndex, chunkSize, chunkData)
  }

  async updateMetadata(file, downloadedChunks) {
    return this._store.updateMetadata(file, downloadedChunks)
  }

  async getMetadata(fileId) {
    return this._store.getMetadata(fileId)
  }

  async getChunks(fileId) {
    return this._store.getChunks(fileId)
  }

  async cleanupFileData(fileId) {
    return this._store.cleanupFileData(fileId)
  }

  async cleanupExpiredChunks(fileId) {
    return this._store.cleanupExpiredChunks(fileId)
  }

  close() {
    if (this.db) {
      this._store.close()
      this._store = null
    }
  }
}

import FileContext from '../FileContext'
import type { FileMetadata, StorageChunk, IStorage } from './Storage'
import { buildMetadata } from './Storage'

const EXPIRATION_TIME = 10 * 3600 * 1000 // 10 hour

/**
 * IndexedDB 数据结构:
 *
 * Database: file_chunks_db
 *   ├── Object Store: chunks          // 分片数据
 *   │     keyPath: [fileId, chunkIndex] (复合主键)
 *   │     indexes:
 *   │       - fileId   (non-unique, 按文件查询所有分片)
 *   │       - updateAt (non-unique, 按时间清理过期数据)
 *   │     记录结构: { fileId, chunkIndex, chunkSize, data: Blob, updateAt }
 *   │
 *   └── Object Store: metadata        // 文件元信息
 *         keyPath: fileId
 *         indexes:
 *           - updateAt (non-unique, 按时间清理过期数据)
 *         记录结构: { fileId, fileName, totalSize, chunkSize, totalChunks,
 *                     action, url, downloadedChunks: number[], updateAt }
 */

export default class IndexedDBWrapper implements IStorage {
  public dbName: string
  public version: number
  public db: IDBDatabase | null
  private initPromise: Promise<IDBDatabase> | null

  constructor(version = 1, dbName = 'file_chunks_db') {
    this.dbName = dbName
    this.version = version
    this.db = null
    this.initPromise = null
  }

  init(): Promise<IDBDatabase> {
    if (this.db) return Promise.resolve(this.db)
    if (this.initPromise) return this.initPromise

    this.initPromise = new Promise((resolve, reject) => {
      const request = window.indexedDB.open(this.dbName, this.version)
      request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
        const db = (event.target as IDBOpenDBRequest).result
        if (!db.objectStoreNames.contains('chunks')) {
          const chunksStore = db.createObjectStore('chunks', {
            keyPath: ['fileId', 'chunkIndex']
          })
          chunksStore.createIndex('fileId', 'fileId', { unique: false })
          chunksStore.createIndex('updateAt', 'updateAt', { unique: false })
        }
        if (!db.objectStoreNames.contains('metadata')) {
          const metaStore = db.createObjectStore('metadata', { keyPath: 'fileId' })
          metaStore.createIndex('updateAt', 'updateAt', { unique: false })
        }
      }

      request.onsuccess = (event: Event) => {
        this.db = (event.target as IDBOpenDBRequest).result
        resolve(this.db)
      }

      request.onerror = (event: Event) => {
        this.initPromise = null
        reject((event.target as IDBOpenDBRequest).error)
      }
    })
    return this.initPromise
  }

  async transaction(storeName: 'chunks' | 'metadata', mode: IDBTransactionMode = 'readonly') {
    await this.init()
    const tx = this.db!.transaction([storeName], mode)
    const store = tx.objectStore(storeName)
    return store
  }

  async checkChunk(fileId: string, chunkIndex: number): Promise<boolean> {
    const store = await this.transaction('chunks', 'readonly')

    return new Promise((resolve, reject) => {
      const request = store.get([fileId, chunkIndex])
      request.onsuccess = () => {
        if (!request.result?.data) {
          console.log(`✗ ${chunkIndex} ---`)
          return resolve(false)
        }
        console.log(`✓ ${chunkIndex}`)
        resolve(true)
      }
      request.onerror = () => reject(request.error)
    })
  }

  async saveChunk(fileId: string, chunkIndex: number, chunkSize: number, chunkData: Blob): Promise<StorageChunk> {
    const payload: StorageChunk = {
      fileId,
      chunkIndex,
      chunkSize,
      data: chunkData,
      updateAt: Date.now()
    }

    const store = await this.transaction('chunks', 'readwrite')

    return new Promise((resolve, reject) => {
      const request = store.put(payload)
      request.onsuccess = () => {
        console.log(`${chunkIndex} Put successful -----`)
        resolve(payload)
      }
      request.onerror = () => reject(request.error)
    })
  }

  async updateMetadata(file: FileContext, downloadedChunks: number[]): Promise<void> {
    const metaPayload = buildMetadata(file, downloadedChunks)

    const store = await this.transaction('metadata', 'readwrite')
    return new Promise((resolve, reject) => {
      const request = store.put(metaPayload)
      request.onsuccess = () => {
        resolve()
      }
      request.onerror = (event) => reject((event.target as IDBRequest).error)
    })
  }

  async getMetadata(fileId: string): Promise<FileMetadata | null> {
    const store = await this.transaction('metadata')
    return new Promise((resolve, reject) => {
      const request = store.get(fileId)
      request.onsuccess = () => {
        resolve(request.result ?? null)
      }
      request.onerror = (event) => reject((event.target as IDBRequest).error)
    })
  }

  async getChunks(fileId: string): Promise<StorageChunk[]> {
    const store = await this.transaction('chunks')
    return new Promise((resolve, reject) => {
      const index = store.index('fileId')
      const request = index.getAll(fileId)
      request.onsuccess = () => resolve(request.result)
      request.onerror = (event) => reject((event.target as IDBRequest).error)
    })
  }

  async cleanupFileData(fileId: string): Promise<boolean> {
    // 开启事务（跨对象存储事务需要较新浏览器支持）
    await this.init()
    const transaction = this.db!.transaction(['chunks', 'metadata'], 'readwrite')

    // 删除所有分片数据
    const chunksStore = transaction.objectStore('chunks')
    const chunksIndex = chunksStore.index('fileId')
    const range = IDBKeyRange.only(fileId)
    chunksIndex.openCursor(range).onsuccess = (event) => {
      const cursor = (event.target as IDBRequest).result
      if (cursor) {
        cursor.delete()
        cursor.continue()
      }
    }

    // 删除元数据
    const metadataStore = transaction.objectStore('metadata')
    metadataStore.delete(fileId)

    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve(true)
      transaction.onerror = () => reject(transaction.error)
    })
  }

  async cleanupExpiredChunks(): Promise<boolean> {
    const nowTime = Date.now()

    // 开启事务（跨对象存储事务需要较新浏览器支持）
    await this.init()
    const transaction = this.db!.transaction(['chunks', 'metadata'], 'readwrite')

    const range = IDBKeyRange.upperBound(nowTime - EXPIRATION_TIME)

    // 删除元数据
    const metadataStore = transaction.objectStore('metadata')
    const metaIndex = metadataStore.index('updateAt')
    const metaIndexReauqest = metaIndex.openCursor(range)
    const metaIndexReauqestPromise = new Promise((resolve) => {
      metaIndexReauqest.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result
        if (cursor) {
          cursor.delete()
          cursor.continue()
        }
        resolve(true)
      }
    })
    await metaIndexReauqestPromise

    const chunksStore = transaction.objectStore('chunks')
    const chunksIndex = chunksStore.index('updateAt')
    chunksIndex.openCursor(range).onsuccess = (event) => {
      const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result
      if (cursor) {
        cursor.delete()
        cursor.continue()
      }
    }

    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => {
        resolve(true)
      }
      transaction.onerror = () => reject(transaction.error)
    })
  }

  close(): void {
    if (this.db) {
      this.db.close()
      this.db = null
      this.initPromise = null
    }
  }
}

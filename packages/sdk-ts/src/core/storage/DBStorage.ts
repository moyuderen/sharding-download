const EXPIRATION_TIME = 5 * 3600 * 1000 // 1 hour

export default class DBStorage {
  constructor(version = 1) {
    this.dbName = 'file_chunks_db'
    this.version = version
  }

  init() {
    return new Promise((resolve, reject) => {
      const request = window.indexedDB.open(this.dbName, this.version)
      request.onupgradeneeded = (event) => {
        const db = event.target.result
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

      request.onsuccess = (event) => {
        this.db = event.target.result
        resolve(this.db)
      }

      request.onerror = (event) => {
        reject(event.target.error)
      }
    })
  }

  async transaction(storeName, mode = 'readonly') {
    await this.init()
    const tx = this.db.transaction([storeName], mode)
    const store = tx.objectStore(storeName)
    return store
  }

  async checkChunk(fileId, chunkIndex) {
    const store = await this.transaction('chunks', 'readonly')

    return new Promise((resolve, reject) => {
      const request = store.get([fileId, chunkIndex])
      request.onsuccess = () => {
        if (request.result) {
          console.log('checkChunk: exists ------')
          resolve(true)
        } else {
          console.log("checkChunk: doesn't exist. -----")
          resolve(false)
        }
      }
      request.onerror = () => reject(request.error)
    })
  }

  async saveChunk(fileId, chunkIndex, chunkSize, chunkData) {
    const payload = {
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
        console.log('Put successful -----')
        resolve(true)
      }
      request.onerror = () => reject(request.error)
    })
  }

  async updateMetadata(file, downloadedChunks) {
    const metaPayload = {
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

    const store = await this.transaction('metadata', 'readwrite')
    return new Promise((resolve, reject) => {
      const request = store.put(metaPayload)
      request.onsuccess = () => {
        resolve(request.result)
      }
      request.onerror = (event) => reject(event.target.error)
    })
  }

  async getMetadata(fileId) {
    const store = await this.transaction('metadata')
    return new Promise((resolve, reject) => {
      const request = store.get(fileId)
      request.onsuccess = () => {
        resolve(request.result)
      }
      request.onerror = (event) => reject(event.target.error)
    })
  }

  async getChunks(fileId) {
    const store = await this.transaction('chunks')
    return new Promise((resolve, reject) => {
      const index = store.index('fileId')
      const request = index.getAll(fileId)
      request.onsuccess = () => resolve(request.result)
      request.onerror = (event) => reject(event.target.error)
    })
  }

  async cleanupFileData(fileId) {
    // 开启事务（跨对象存储事务需要较新浏览器支持）
    await this.init()
    const transaction = this.db.transaction(['chunks', 'metadata'], 'readwrite')

    // 删除所有分片数据
    const chunksStore = transaction.objectStore('chunks')
    const chunksIndex = chunksStore.index('fileId')
    const range = IDBKeyRange.only(fileId)
    chunksIndex.openCursor(range).onsuccess = (event) => {
      const cursor = event.target.result
      if (cursor) {
        cursor.delete()
        cursor.continue()
      }
    }

    // 删除元数据
    const metadataStore = transaction.objectStore('metadata')
    metadataStore.delete(fileId)

    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve()
      transaction.onerror = () => reject(transaction.error)
    })
  }

  async cleanupExpiredChunks() {
    const nowTime = Date.now()

    // 开启事务（跨对象存储事务需要较新浏览器支持）
    await this.init()
    const transaction = this.db.transaction(['chunks', 'metadata'], 'readwrite')

    const range = IDBKeyRange.upperBound(nowTime - EXPIRATION_TIME)

    // 删除元数据
    const metadataStore = transaction.objectStore('metadata')
    const metaIndex = metadataStore.index('updateAt')
    const metaIndexReauqest = metaIndex.openCursor(range)
    const metaIndexReauqestPromise = new Promise((resolve, reject) => {
      metaIndexReauqest.onsuccess = (event) => {
        const cursor = event.target.result
        if (cursor) {
          cursor.delete()
          cursor.continue()
        }
        resolve()
      }
    })
    await metaIndexReauqestPromise

    const chunksStore = transaction.objectStore('chunks')
    const chunksIndex = chunksStore.index('updateAt')
    chunksIndex.openCursor(range).onsuccess = (event) => {
      const cursor = event.target.result
      if (cursor) {
        cursor.delete()
        cursor.continue()
      }
    }

    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => {
        console.log('清理过期数据完成')
        resolve()
      }
      transaction.onerror = () => reject(transaction.error)
    })
  }

  close() {
    if (this.db) {
      this.db.close()
      this.db = null
    }
  }
}

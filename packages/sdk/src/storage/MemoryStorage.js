const EXPIRATION_TIME = 5 * 3600 * 1000 // 5 hour

// const store = {
//   fileId: {
//     metadata: {},
//     chunksMap: {
//       chunkIndex: {}
//   }
// }

class MemoryStorage {
  constructor() {
    this.store = new Map()
  }

  checkChunk(fileId, chunkIndex) {
    return new Promise((resolve) => {
      const fileMap = this.store.get(fileId)
      if (!fileMap) {
        return resolve(false)
      }
      const chunks = fileMap.get('chunksMap')
      if (!chunks) {
        return resolve(false)
      }
      resolve(chunks.has(chunkIndex))
    })
  }

  saveChunk(fileId, chunkIndex, chunkSize, chunkData) {
    const payload = {
      fileId,
      chunkIndex,
      chunkSize,
      data: chunkData,
      updateAt: Date.now()
    }

    return new Promise((resolve) => {
      const fileMap = this.store.get(fileId) || new Map()
      const chunks = fileMap.get('chunksMap') || new Map()

      chunks.set(chunkIndex, payload)
      fileMap.set('chunksMap', chunks)
      this.store.set(fileId, fileMap)

      resolve(payload)
    })
  }

  updateMetadata(file, downloadedChunks) {
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

    const fileMap = this.store.get(metaPayload.fileId) || new Map()
    fileMap.set('metadata', metaPayload)
    this.store.set(metaPayload.fileId, fileMap)

    return Promise.resolve()
  }

  getMetadata(fileId) {
    return new Promise((resolve) => {
      const fileMap = this.store.get(fileId)
      if (!fileMap) {
        return resolve(null)
      }
      const metadata = fileMap.get('metadata')
      if (!metadata) {
        return resolve(null)
      }
      resolve(metadata)
    })
  }

  getChunks(fileId) {
    return new Promise((resolve) => {
      const fileMap = this.store.get(fileId)
      if (!fileMap) {
        return resolve([])
      }
      const chunks = fileMap.get('chunksMap')
      if (!chunks) {
        return resolve([])
      }
      const chunkArray = Array.from(chunks.values())
      resolve(chunkArray)
    })
  }

  cleanupFileData(fileId) {
    return new Promise((resolve) => {
      this.store.delete(fileId)
      resolve()
    })
  }

  cleanupExpiredChunks(fileId) {
    return new Promise((resolve) => {
      const fileMap = this.store.get(fileId)
      if (!fileMap) {
        return resolve()
      }
      const chunks = fileMap.get('chunksMap')
      if (!chunks) {
        return resolve()
      }
      const now = Date.now()
      for (const [chunkIndex, chunk] of chunks.entries()) {
        if (now - chunk.updateAt > EXPIRATION_TIME) {
          chunks.delete(chunkIndex)
        }
      }
      const metadata = fileMap.get('metadata')
      if (metadata) {
        if (now - metadata.updateAt > EXPIRATION_TIME) {
          this.store.delete(fileId)
        }
      }
      resolve()
    })
  }

  close() {
    this.store.clear()
  }
}

export default MemoryStorage

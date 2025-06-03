import FileContext from '../FileContext'
import type { FileMetadata, StorageChunk } from './Storage'

const EXPIRATION_TIME = 10 * 3600 * 1000 // 10 hour

// const store = {
//   afe35b83ccd35635b9ea7dc49ba5808c282533499275c8c811da2138c90b5b38: {
//     metadata: FileMetadata,
//     chunksMap: {
//       0: StorageChunk0,
//       1: StorageChunk1
//     }
//   }
// }

class MemoryStorage {
  private store: Map<any, any>
  constructor() {
    this.store = new Map()
  }

  checkChunk(fileId: string, chunkIndex: number) {
    return new Promise((resolve) => {
      const fileMap = this.store.get(fileId)
      if (!fileMap) {
        return resolve(false)
      }
      const chunks = fileMap.get('chunksMap')
      if (!chunks) {
        return resolve(false)
      }
      resolve(chunks.has(chunkIndex) && chunks.get(chunkIndex).data)
    })
  }

  saveChunk(fileId: string, chunkIndex: number, chunkSize: number, chunkData: Blob) {
    const payload: StorageChunk = {
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

  updateMetadata(file: FileContext, downloadedChunks: number[]) {
    const metaPayload: FileMetadata = {
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

  getMetadata(fileId: string): Promise<FileMetadata | null> {
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

  getChunks(fileId: string): Promise<StorageChunk[]> {
    return new Promise((resolve) => {
      const fileMap = this.store.get(fileId)
      if (!fileMap) {
        return resolve([])
      }
      const chunks = fileMap.get('chunksMap')
      if (!chunks) {
        return resolve([])
      }
      const chunkArray = Array.from(chunks.values()) as StorageChunk[]
      resolve(chunkArray)
    })
  }

  cleanupFileData(fileId: string) {
    return new Promise((resolve) => {
      this.store.delete(fileId)
      resolve(true)
    })
  }

  cleanupExpiredChunks() {
    const now = Date.now()

    return new Promise((resolve) => {
      for (let fileMap of this.store.values()) {
        const metadata = fileMap.get('metadata')
        const fileId = metadata.fileId
        if (!fileMap) {
          continue
        }

        const chunks = fileMap.get('chunksMap')
        if (!chunks) {
          this.store.delete(fileId)
          continue
        }

        for (const [chunkIndex, chunk] of chunks.entries()) {
          if (now - chunk.updateAt > EXPIRATION_TIME) {
            chunks.delete(chunkIndex)
          }
        }

        if (metadata) {
          if (now - metadata.updateAt > EXPIRATION_TIME) {
            this.store.delete(fileId)
          }
        }
      }

      resolve(true)
    })
  }

  close() {
    this.store.clear()
  }
}

export default MemoryStorage

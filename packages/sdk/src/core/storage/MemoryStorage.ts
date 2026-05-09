import FileContext from '../FileContext'
import type { FileMetadata, StorageChunk, IStorage } from './Storage'
import { buildMetadata } from './Storage'

const EXPIRATION_TIME = 10 * 3600 * 1000 // 10 hour

/**
 * MemoryStorage 数据结构:
 *
 * store = Map {
 *   [fileId: string] => Map {
 *     'metadata'  => FileMetadata          // 文件元信息
 *     'chunksMap' => Map {                  // 分片数据
 *       [chunkIndex: number] => StorageChunk
 *     }
 *   }
 * }
 *
 * 示例:
 * store = Map {
 *   'afe35b83...' => Map {
 *     'metadata'  => { fileId, fileName, totalSize, ... }
 *     'chunksMap' => Map {
 *       0 => { fileId, chunkIndex: 0, data: Blob, ... }
 *       1 => { fileId, chunkIndex: 1, data: Blob, ... }
 *     }
 *   }
 * }
 */

class MemoryStorage implements IStorage {
  private store: Map<string, Map<string, any>>

  constructor() {
    this.store = new Map()
  }

  checkChunk(fileId: string, chunkIndex: number): Promise<boolean> {
    const fileMap = this.store.get(fileId)
    if (!fileMap) return Promise.resolve(false)
    const chunks: Map<number, StorageChunk> = fileMap.get('chunksMap')
    if (!chunks) return Promise.resolve(false)
    const chunk = chunks.get(chunkIndex)
    return Promise.resolve(!!(chunk && chunk.data))
  }

  saveChunk(fileId: string, chunkIndex: number, chunkSize: number, chunkData: Blob): Promise<StorageChunk> {
    const payload: StorageChunk = {
      fileId,
      chunkIndex,
      chunkSize,
      data: chunkData,
      updateAt: Date.now()
    }

    let fileMap = this.store.get(fileId)
    if (!fileMap) {
      fileMap = new Map<string, any>()
      this.store.set(fileId, fileMap)
    }
    let chunks: Map<number, StorageChunk> = fileMap.get('chunksMap')
    if (!chunks) {
      chunks = new Map()
      fileMap.set('chunksMap', chunks)
    }
    chunks.set(chunkIndex, payload)

    return Promise.resolve(payload)
  }

  updateMetadata(file: FileContext, downloadedChunks: number[]): Promise<void> {
    const metaPayload = buildMetadata(file, downloadedChunks)

    let fileMap = this.store.get(metaPayload.fileId)
    if (!fileMap) {
      fileMap = new Map<string, any>()
      this.store.set(metaPayload.fileId, fileMap)
    }
    fileMap.set('metadata', metaPayload)

    return Promise.resolve()
  }

  getMetadata(fileId: string): Promise<FileMetadata | null> {
    const fileMap = this.store.get(fileId)
    if (!fileMap) return Promise.resolve(null)
    const metadata = fileMap.get('metadata')
    if (!metadata) return Promise.resolve(null)
    return Promise.resolve(metadata)
  }

  getChunks(fileId: string): Promise<StorageChunk[]> {
    const fileMap = this.store.get(fileId)
    if (!fileMap) return Promise.resolve([])
    const chunks: Map<number, StorageChunk> = fileMap.get('chunksMap')
    if (!chunks) return Promise.resolve([])
    return Promise.resolve(Array.from(chunks.values()))
  }

  cleanupFileData(fileId: string): Promise<boolean> {
    this.store.delete(fileId)
    return Promise.resolve(true)
  }

  cleanupExpiredChunks(): Promise<boolean> {
    const now = Date.now()

    for (const [fileId, fileMap] of this.store.entries()) {
      const metadata: FileMetadata | undefined = fileMap.get('metadata')
      const chunks: Map<number, StorageChunk> | undefined = fileMap.get('chunksMap')

      if (chunks) {
        for (const [chunkIndex, chunk] of chunks.entries()) {
          if (now - chunk.updateAt > EXPIRATION_TIME) {
            chunks.delete(chunkIndex)
          }
        }
      }

      if (metadata && now - metadata.updateAt > EXPIRATION_TIME) {
        this.store.delete(fileId)
      }
    }

    return Promise.resolve(true)
  }

  close(): void {
    this.store.clear()
  }
}

export default MemoryStorage

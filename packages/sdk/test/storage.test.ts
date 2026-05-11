import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type FileContext from '../src/core/FileContext'
import { buildMetadata } from '../src/core/storage/Storage'
import MemoryStorage from '../src/core/storage/MemoryStorage'
import IndexedDBWrapper from '../src/core/storage/DBStorage'

const EXPIRATION_TIME = 10 * 3600 * 1000

function createFileContext(overrides: Partial<FileContext> = {}) {
  return {
    etag: 'file-1',
    name: 'demo.zip',
    size: 4096,
    chunkSize: 1024,
    totalChunks: 4,
    action: '/download',
    url: 'https://example.com/demo.zip',
    ...overrides
  } as FileContext
}

function createSuccessRequest<T>(result: T) {
  const request: any = { result, error: null }
  queueMicrotask(() => {
    request.onsuccess?.({ target: request })
  })
  return request
}

function createCursorRequest<T>(items: T[], onDelete: (item: T) => void, onDone?: () => void) {
  let successHandler: ((event: any) => void) | null = null
  const request: any = { result: null, error: null }
  let index = 0

  const emit = () => {
    const item = items[index++]
    request.result =
      item === undefined
        ? null
        : {
            value: item,
            delete: vi.fn(() => onDelete(item)),
            continue: () => queueMicrotask(emit)
          }
    successHandler?.({ target: request })
    if (item === undefined) {
      onDone?.()
    }
  }

  Object.defineProperty(request, 'onsuccess', {
    configurable: true,
    get() {
      return successHandler
    },
    set(handler) {
      successHandler = handler
      queueMicrotask(emit)
    }
  })

  return request
}

describe('storage helpers', () => {
  it('buildMetadata maps file context fields and keeps downloaded chunks', () => {
    const nowSpy = vi.spyOn(Date, 'now').mockReturnValue(123456)
    const file = createFileContext({
      etag: 'etag-1',
      name: 'report.pdf',
      size: 2048,
      chunkSize: 512,
      totalChunks: 4,
      action: '/files',
      url: 'https://example.com/report.pdf'
    })

    expect(buildMetadata(file, [0, 2])).toEqual({
      fileId: 'etag-1',
      fileName: 'report.pdf',
      totalSize: 2048,
      chunkSize: 512,
      totalChunks: 4,
      action: '/files',
      url: 'https://example.com/report.pdf',
      downloadedChunks: [0, 2],
      updateAt: 123456
    })

    nowSpy.mockRestore()
  })
})

describe('MemoryStorage', () => {
  it('saves and reads chunk data and metadata', async () => {
    const storage = new MemoryStorage()
    const chunk = new Blob(['chunk-0'])
    const file = createFileContext()

    await storage.saveChunk(file.etag, 0, 1024, chunk)
    await storage.updateMetadata(file, [0])

    expect(await storage.checkChunk(file.etag, 0)).toBe(true)
    expect(await storage.checkChunk(file.etag, 1)).toBe(false)
    expect(await storage.getMetadata(file.etag)).toMatchObject({
      fileId: file.etag,
      fileName: file.name,
      downloadedChunks: [0]
    })
    expect(await storage.getChunks(file.etag)).toEqual([
      expect.objectContaining({
        fileId: file.etag,
        chunkIndex: 0,
        chunkSize: 1024,
        data: chunk
      })
    ])
  })

  it('cleanupExpiredChunks removes expired chunks and keeps fresh metadata', async () => {
    const storage = new MemoryStorage()
    const file = createFileContext()
    const nowSpy = vi.spyOn(Date, 'now')

    nowSpy.mockReturnValue(1_000)
    await storage.saveChunk(file.etag, 0, 1024, new Blob(['old']))

    nowSpy.mockReturnValue(EXPIRATION_TIME - 1_000)
    await storage.saveChunk(file.etag, 1, 1024, new Blob(['fresh']))
    await storage.updateMetadata(file, [0, 1])

    nowSpy.mockReturnValue(EXPIRATION_TIME + 2_000)
    await storage.cleanupExpiredChunks()

    expect((await storage.getChunks(file.etag)).map((chunk) => chunk.chunkIndex)).toEqual([1])
    expect(await storage.getMetadata(file.etag)).not.toBeNull()

    nowSpy.mockRestore()
  })

  it('cleanupExpiredChunks removes the whole file when metadata expires', async () => {
    const storage = new MemoryStorage()
    const file = createFileContext()
    const nowSpy = vi.spyOn(Date, 'now')

    nowSpy.mockReturnValue(5_000)
    await storage.saveChunk(file.etag, 0, 1024, new Blob(['chunk']))
    await storage.updateMetadata(file, [0])

    nowSpy.mockReturnValue(5_000 + EXPIRATION_TIME + 1)
    await storage.cleanupExpiredChunks()

    expect(await storage.getMetadata(file.etag)).toBeNull()
    expect(await storage.getChunks(file.etag)).toEqual([])

    nowSpy.mockRestore()
  })

  it('cleanupFileData and close clear stored state', async () => {
    const storage = new MemoryStorage()
    const file = createFileContext()

    await storage.saveChunk(file.etag, 0, 1024, new Blob(['chunk']))
    await storage.updateMetadata(file, [0])
    expect(await storage.cleanupFileData(file.etag)).toBe(true)
    expect(await storage.getMetadata(file.etag)).toBeNull()

    await storage.saveChunk(file.etag, 1, 1024, new Blob(['chunk-1']))
    storage.close()
    expect(await storage.getChunks(file.etag)).toEqual([])
  })
})

describe('IndexedDBWrapper', () => {
  let originalIDBKeyRange: typeof globalThis.IDBKeyRange | undefined

  beforeEach(() => {
    originalIDBKeyRange = globalThis.IDBKeyRange
    ;(globalThis as any).IDBKeyRange = {
      only: vi.fn((value: string) => ({ type: 'only', value })),
      upperBound: vi.fn((value: number) => ({ type: 'upperBound', value }))
    }
    vi.spyOn(console, 'log').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
    if (originalIDBKeyRange === undefined) {
      delete (globalThis as any).IDBKeyRange
      return
    }
    ;(globalThis as any).IDBKeyRange = originalIDBKeyRange
  })

  it('checkChunk resolves based on whether chunk data exists', async () => {
    const storage = new IndexedDBWrapper()
    const transaction = vi.spyOn(storage, 'transaction')

    transaction.mockResolvedValueOnce({
      get: vi.fn(() => createSuccessRequest({ data: new Blob(['chunk']) }))
    } as any)
    await expect(storage.checkChunk('file-1', 0)).resolves.toBe(true)

    transaction.mockResolvedValueOnce({
      get: vi.fn(() => createSuccessRequest({ data: null }))
    } as any)
    await expect(storage.checkChunk('file-1', 1)).resolves.toBe(false)
  })

  it('saveChunk, updateMetadata, getMetadata and getChunks use the expected stores', async () => {
    const storage = new IndexedDBWrapper()
    const file = createFileContext()
    const nowSpy = vi.spyOn(Date, 'now').mockReturnValue(999)
    const chunk = new Blob(['chunk'])
    const putChunk = vi.fn(() => createSuccessRequest(undefined))
    const putMetadata = vi.fn(() => createSuccessRequest(undefined))
    const getMetadata = vi.fn(() => createSuccessRequest({ fileId: file.etag, fileName: file.name }))
    const getAll = vi.fn(() => createSuccessRequest([{ fileId: file.etag, chunkIndex: 0, chunkSize: 1024, data: chunk, updateAt: 999 }]))

    vi.spyOn(storage, 'transaction')
      .mockResolvedValueOnce({ put: putChunk } as any)
      .mockResolvedValueOnce({ put: putMetadata } as any)
      .mockResolvedValueOnce({ get: getMetadata } as any)
      .mockResolvedValueOnce({
        index: vi.fn(() => ({ getAll }))
      } as any)

    await expect(storage.saveChunk(file.etag, 0, 1024, chunk)).resolves.toEqual({
      fileId: file.etag,
      chunkIndex: 0,
      chunkSize: 1024,
      data: chunk,
      updateAt: 999
    })
    await expect(storage.updateMetadata(file, [0])).resolves.toBeUndefined()
    await expect(storage.getMetadata(file.etag)).resolves.toEqual({ fileId: file.etag, fileName: file.name })
    await expect(storage.getChunks(file.etag)).resolves.toEqual([
      { fileId: file.etag, chunkIndex: 0, chunkSize: 1024, data: chunk, updateAt: 999 }
    ])

    expect(putChunk).toHaveBeenCalledWith(expect.objectContaining({ fileId: file.etag, chunkIndex: 0 }))
    expect(putMetadata).toHaveBeenCalledWith(expect.objectContaining({ fileId: file.etag, downloadedChunks: [0] }))
    expect(getMetadata).toHaveBeenCalledWith(file.etag)
    expect(getAll).toHaveBeenCalledWith(file.etag)

    nowSpy.mockRestore()
  })

  it('cleanupFileData deletes file chunks and metadata in one transaction', async () => {
    const deletedChunks: Array<{ fileId: string; chunkIndex: number }> = []
    const metadataDelete = vi.fn()
    const transaction: any = {
      objectStore: vi.fn()
    }
    const chunksCursorRequest = createCursorRequest(
      [
        { fileId: 'file-1', chunkIndex: 0 },
        { fileId: 'file-1', chunkIndex: 1 }
      ],
      (item) => deletedChunks.push(item),
      () => transaction.oncomplete?.()
    )

    transaction.objectStore.mockImplementation((name: string) => {
      if (name === 'chunks') {
        return {
          index: vi.fn(() => ({
            openCursor: vi.fn(() => chunksCursorRequest)
          }))
        }
      }
      return { delete: metadataDelete }
    })

    const storage = new IndexedDBWrapper()
    vi.spyOn(storage, 'init').mockImplementation(async () => storage.db as IDBDatabase)
    storage.db = {
      transaction: vi.fn(() => transaction)
    } as any

    await expect(storage.cleanupFileData('file-1')).resolves.toBe(true)

    expect(globalThis.IDBKeyRange.only).toHaveBeenCalledWith('file-1')
    expect(deletedChunks).toEqual([
      { fileId: 'file-1', chunkIndex: 0 },
      { fileId: 'file-1', chunkIndex: 1 }
    ])
    expect(metadataDelete).toHaveBeenCalledWith('file-1')
  })

  it('cleanupExpiredChunks deletes expired metadata and chunks by updateAt index', async () => {
    const deletedMetadata: Array<{ fileId: string }> = []
    const deletedChunks: Array<{ fileId: string; chunkIndex: number }> = []
    const nowSpy = vi.spyOn(Date, 'now').mockReturnValue(EXPIRATION_TIME + 10_000)
    const transaction: any = {
      objectStore: vi.fn()
    }
    const chunksCursorRequest = createCursorRequest(
      [{ fileId: 'file-1', chunkIndex: 0 }],
      (item) => deletedChunks.push(item),
      () => transaction.oncomplete?.()
    )
    const metadataCursorRequest = createCursorRequest([{ fileId: 'meta-1' }], (item) => deletedMetadata.push(item))

    transaction.objectStore.mockImplementation((name: string) => {
      if (name === 'metadata') {
        return {
          index: vi.fn(() => ({
            openCursor: vi.fn(() => metadataCursorRequest)
          }))
        }
      }
      return {
        index: vi.fn(() => ({
          openCursor: vi.fn(() => chunksCursorRequest)
        }))
      }
    })

    const storage = new IndexedDBWrapper()
    vi.spyOn(storage, 'init').mockImplementation(async () => storage.db as IDBDatabase)
    storage.db = {
      transaction: vi.fn(() => transaction)
    } as any

    await expect(storage.cleanupExpiredChunks()).resolves.toBe(true)

    expect(globalThis.IDBKeyRange.upperBound).toHaveBeenCalledWith(10_000)
    expect(deletedMetadata).toEqual([{ fileId: 'meta-1' }])
    expect(deletedChunks).toEqual([{ fileId: 'file-1', chunkIndex: 0 }])

    nowSpy.mockRestore()
  })

  it('close closes the database and resets cached state', () => {
    const storage = new IndexedDBWrapper()
    const close = vi.fn()

    storage.db = { close } as any
    ;(storage as any).initPromise = Promise.resolve({} as IDBDatabase)

    storage.close()

    expect(close).toHaveBeenCalledOnce()
    expect(storage.db).toBeNull()
    expect((storage as any).initPromise).toBeNull()
  })
})

describe('Storage wrapper', () => {
  const originalWindow = (globalThis as any).window

  afterEach(() => {
    vi.resetModules()
    vi.restoreAllMocks()
    if (originalWindow === undefined) {
      delete (globalThis as any).window
      return
    }
    ;(globalThis as any).window = originalWindow
  })

  it('uses MemoryStorage when indexedDB is unavailable', async () => {
    delete (globalThis as any).window
    vi.resetModules()

    const [{ default: StorageWrapper }, { default: FreshMemoryStorage }] = await Promise.all([
      import('../src/core/storage/Storage'),
      import('../src/core/storage/MemoryStorage')
    ])

    const storage = new StorageWrapper()

    expect(storage.type).toBe('Memory')
    expect((storage as any)._store).toBeInstanceOf(FreshMemoryStorage)
  })

  it('uses IndexedDBWrapper when indexedDB is available', async () => {
    ;(globalThis as any).window = { indexedDB: {} }
    vi.resetModules()

    const [{ default: StorageWrapper }, { default: FreshIndexedDBWrapper }] = await Promise.all([
      import('../src/core/storage/Storage'),
      import('../src/core/storage/DBStorage')
    ])

    const storage = new StorageWrapper()

    expect(storage.type).toBe('IndexedDB')
    expect((storage as any)._store).toBeInstanceOf(FreshIndexedDBWrapper)
  })

  it('delegates calls to the underlying storage implementation', async () => {
    const [{ default: StorageWrapper }] = await Promise.all([import('../src/core/storage/Storage')])
    const storage = new StorageWrapper()
    const file = createFileContext()
    const delegated = {
      checkChunk: vi.fn().mockResolvedValue(true),
      saveChunk: vi.fn().mockResolvedValue('saved'),
      updateMetadata: vi.fn().mockResolvedValue(undefined),
      getMetadata: vi.fn().mockResolvedValue({ fileId: file.etag }),
      getChunks: vi.fn().mockResolvedValue([{ chunkIndex: 0 }]),
      cleanupFileData: vi.fn().mockResolvedValue(true),
      cleanupExpiredChunks: vi.fn().mockResolvedValue(true),
      close: vi.fn()
    }

    ;(storage as any)._store = delegated

    await expect(storage.checkChunk(file.etag, 0)).resolves.toBe(true)
    await expect(storage.saveChunk(file.etag, 0, 1024, new Blob(['chunk']))).resolves.toBe('saved')
    await expect(storage.updateMetadata(file, [0])).resolves.toBeUndefined()
    await expect(storage.getMetadata(file.etag)).resolves.toEqual({ fileId: file.etag })
    await expect(storage.getChunks(file.etag)).resolves.toEqual([{ chunkIndex: 0 }])
    await expect(storage.cleanupFileData(file.etag)).resolves.toBe(true)
    await expect(storage.cleanupExpiredChunks()).resolves.toBe(true)

    storage.close()

    expect(delegated.checkChunk).toHaveBeenCalledWith(file.etag, 0)
    expect(delegated.saveChunk).toHaveBeenCalledWith(file.etag, 0, 1024, expect.any(Blob))
    expect(delegated.updateMetadata).toHaveBeenCalledWith(file, [0])
    expect(delegated.getMetadata).toHaveBeenCalledWith(file.etag)
    expect(delegated.getChunks).toHaveBeenCalledWith(file.etag)
    expect(delegated.cleanupFileData).toHaveBeenCalledWith(file.etag)
    expect(delegated.cleanupExpiredChunks).toHaveBeenCalledOnce()
    expect(delegated.close).toHaveBeenCalledOnce()
  })
})

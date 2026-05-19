import { describe, expect, it, vi } from 'vitest'
import FileContext from '../src/core/FileContext'
import { FileStatus } from '../src/core/constants'

describe('FileContext cancellation', () => {
  it('settles in-flight chunk downloads on cancel without emitting failed', async () => {
    const listeners = {
      failed: vi.fn(),
      cancelled: vi.fn(),
      change: vi.fn(),
      progress: vi.fn(),
      success: vi.fn()
    }

    const abortSpy = vi.fn()
    const customRequest = vi.fn((options: any) => {
      if (options.data.index === -1) {
        queueMicrotask(() => {
          options.onSuccess({
            data: new Blob(['meta']),
            status: 206,
            headers: {
              'content-length': '2',
              'content-range': 'bytes 0-1/4',
              'content-disposition': 'attachment; filename="demo.txt"',
              etag: 'etag-1'
            }
          })
        })

        return {
          abort: vi.fn(),
          canceled: false
        }
      }

      return {
        abort: () => {
          abortSpy()
          options.onFail(new Error('Request was aborted'))
        },
        canceled: false
      }
    })

    const storage = {
      cleanupExpiredChunks: vi.fn().mockResolvedValue(true),
      getMetadata: vi.fn().mockResolvedValue(null),
      cleanupFileData: vi.fn().mockResolvedValue(true),
      updateMetadata: vi.fn().mockResolvedValue(undefined),
      checkChunk: vi.fn().mockResolvedValue(false),
      saveChunk: vi.fn().mockResolvedValue(undefined),
      getChunks: vi.fn().mockResolvedValue([]),
      close: vi.fn()
    }

    const downloader: any = {
      storage,
      fileList: [],
      emit: vi.fn((name: string, ...args: any[]) => {
        listeners[name as keyof typeof listeners]?.(...args)
      }),
      _addFile(file: FileContext) {
        this.fileList.push(file)
      }
    }

    const file = new FileContext({
      action: '/download',
      chunkSize: 4,
      customRequest,
      data: {},
      headers: {},
      isPart: true,
      maxRetries: 0,
      mockErrorChunks: [],
      requestSucceed: vi.fn().mockResolvedValue(true),
      retryInterval: 0,
      storageName: 'test-db',
      storageVersion: 1,
      threads: 1,
      url: 'https://example.com/demo.txt'
    }, downloader)

    await vi.waitFor(() => {
      expect(file.status).toBe(FileStatus.DOWNLOADING)
    })

    file.cancel()

    await vi.waitFor(() => {
      expect(file.status).toBe(FileStatus.CANCELLED)
    })

    await Promise.resolve()
    await Promise.resolve()

    expect(abortSpy).toHaveBeenCalledOnce()
    expect(listeners.cancelled).toHaveBeenCalledOnce()
    expect(listeners.failed).not.toHaveBeenCalled()
    expect(file.status).toBe(FileStatus.CANCELLED)
  })
})

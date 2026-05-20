import request from './request'
import { getBody } from '../helper'
import type { DownloaderOptions } from './typings'

export const defaultsConfig: DownloaderOptions = {
  storageVersion: 1,
  storageName: 'file_chunks_db',
  action: '',
  method: 'POST',
  data: {},
  headers: {
    'content-type': 'application/json;charset=UTF-8'
  },
  chunkSize: 2 * 1024 * 1024,
  threads: 6,
  customRequest: request,
  maxRetries: 3,
  retryInterval: 500,
  timeout: 0,
  withCredentials: true,
  requestSucceed: async (data) => {
    const body = await getBody(data) as Record<string, any>
    if (body.code && body.code !== '00000') {
      return false
    }
    return true
  },
  isPart: true,
  mockErrorChunks: []
}

export const FileStatus = {
  INIT: 'init',
  READY: 'ready',
  DOWNLOADING: 'downloading',
  DOWNLOADED: 'downloaded',
  CANCELLED: 'cancelled',
  SUCCESS: 'success',
  FAILED: 'failed'
} as const

export const ChunkStatus = {
  READY: 'ready',
  PENDING: 'pending',
  DOWNLOADING: 'downloading',
  DOWNLOADED: 'downloaded',
  ERROR: 'error'
} as const

export const Callbacks = {
  FAILED: 'failed',
  PROGRESS: 'progress',
  SUCCESS: 'success',
  CHANGE: 'change',
  CANCELLED: 'cancelled'
} as const

export type TypeFileStatus = (typeof FileStatus)[keyof typeof FileStatus]

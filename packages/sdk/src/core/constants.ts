import request from './request'
import { getBody } from '../helper'
import type { DownloaderOptions } from './typings'

export const defaultsConfig: DownloaderOptions = {
  storageVersion: 1,
  storageName: 'file_chunks_db',
  action: '',
  data: {},
  headers: {
    'content-type': 'application/json;charset=UTF-8'
  },
  chunkSize: 1024 * 1024 * 2,
  threads: 6,
  customRequest: request,
  maxRetries: 3,
  retryInterval: 500,
  requestSucceed: async (data) => {
    const body = await getBody(data)
    if (body.code && body.code !== '00000') {
      return false
    }
    return true
  },
  isPart: true
}

export const FileStatus = {
  INIT: 'init',
  READY: 'ready',
  DOWNLOADING: 'downloading',
  DOWNLOADED: 'downloaded',
  CANCELLED: 'cancelled',
  SUCCESS: 'success',
  FAILED: 'failed'
}

export const ChunkStatus = {
  READY: 'ready',
  PENDING: 'pending',
  DOWNLOADING: 'downloading',
  DOWNLOADED: 'downloaded',
  ERROR: 'error'
}

export const Callbacks = {
  FAILED: 'failed',
  PROGRESS: 'progress',
  SUCCESS: 'success',
  CHANGE: 'change',
  CANCELLED: 'canceled'
}

export type TypeFileStatus = (typeof FileStatus)[keyof typeof FileStatus]

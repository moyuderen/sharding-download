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

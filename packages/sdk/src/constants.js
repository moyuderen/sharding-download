export const FileStatus = {
  Init: 'init',
  Ready: 'ready',
  Downloading: 'downloading',
  Downloaded: 'downloaded',
  Cancelled: 'cancelled',
  Success: 'success',
  Fail: 'fail'
}

export const ChunkStatus = {
  Ready: 'Ready',
  Pending: 'Pending',
  Downloading: 'Downloading',
  Downloaded: 'Downloaded',
  Error: 'Error'
}

export const Callbacks = {
  Fail: 'fail',
  Progress: 'progress',
  Success: 'success',
  Change: 'change'
}

export const customConfig = {
  action: 'http://localhost:3100/api/file/download',
  method: 'POST',
  isPart: true,
  chunkSize: 2, // 2MB
  threads: 6,
  maxRetries: 3,
  retryInterval: 500,
  timeout: 0,
  withCredentials: true,
  storageVersion: 1,
  storageName: 'file_chunks_db',
  data: {
    name: 'moyuderen'
  },
  headers: {
    authorization: 'Basic YWxhZGRpbjpvcGVuc2VzYW1l'
  }
}

export const actionList = [
  'http://localhost:3100/api/file/download',
  'https://sharding-download-server.vercel.app/api/file/download'
]

export const urlOptions = [
  {
    label: '711.jpg (vercel支持)',
    value: '711.jpg'
  },
  {
    label: 'book.pdf',
    value: 'book.pdf'
  },
  {
    label: 'Discord.dmg',
    value: 'Discord.dmg'
  }
]

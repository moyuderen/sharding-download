export const DefaultOptions = {
  action: '/',
  chunkSize: 1024 * 1024 * 10,
  isPart: true,
  threads: 6,
  maxRetries: 3,
  retryInterval: 500,
  requestSucceed: () => {},
  customRequest: null
}

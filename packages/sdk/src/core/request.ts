export type RequestHeaders = {
  'content-length': string
  'content-range': string
  'content-disposition': string
  etag: string
  [key: string]: string | undefined
}

export type RequestResponse<T = Blob> = {
  data: T
  status: number
  headers: RequestHeaders
}
export type RequestOptions = {
  /**
   * 分片索引
   */
  index?: number
  /** 下载接口地址 */
  action: string

  /** 接口method类型 */
  method?: 'POST' | 'GET' | 'post' | 'get'

  /** 自定义上传参数 */
  data: {
    url: string
    index?: number
    [key: string]: any
  }

  /** 自定义headers */
  headers: {
    Range?: string
    [key: string]: string | undefined
  }

  /** 超时时间（毫秒），0 表示不超时 */
  timeout?: number

  /** 接口返回类型 */
  responseType?: XMLHttpRequestResponseType

  /** 跨域是否支持携带凭证 */
  withCredentials?: boolean

  /** 下载进度回调 */
  onProgress?: (e: ProgressEvent) => void

  /** 下载成功回调 */
  onSuccess?: (response: RequestResponse) => void

  /** 下载失败回调 */
  onFail?: (error: Error, request?: XMLHttpRequest) => void
}

export type RequestReturn = {
  abort: () => void
  canceled: boolean
}

export type Request = typeof request

function buildQueryString(data: Record<string, any>): string {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(data)) {
    if (value != null) {
      params.append(key, String(value))
    }
  }
  return params.toString()
}

export default function request(options: RequestOptions): RequestReturn {
  const {
    action,
    method = 'POST',
    data = {},
    headers = {},
    timeout = 0,
    responseType = 'blob',
    withCredentials = true,
    onProgress = () => {},
    onSuccess = () => {},
    onFail = () => {}
  } = options

  const xhr = new XMLHttpRequest()
  const result: RequestReturn = { abort: () => {}, canceled: false }
  let completed = false

  const done = (fn: () => void) => {
    if (completed) return
    completed = true
    cleanup()
    fn()
  }

  const cleanup = () => {
    xhr.removeEventListener('timeout', onTimeout)
    xhr.removeEventListener('progress', onProgress)
    xhr.removeEventListener('error', onError)
    xhr.removeEventListener('readystatechange', onReadyStateChange)
  }

  const onTimeout = () =>
    done(() => onFail(new Error('Request timed out'), xhr))
  const onError = () => {
    done(() => {
      const message = result.canceled
        ? 'Request was aborted'
        : `Request failed with status ${xhr.status}`
      onFail(new Error(message), xhr)
    })
  }
  const onReadyStateChange = () => {
    if (xhr.readyState !== 4) return
    done(() => {
      if (xhr.status < 200 || xhr.status >= 300) {
        onFail(new Error(`xhr: status === ${xhr.status}`), xhr)
        return
      }
      onSuccess({
        data: xhr.response,
        status: xhr.status,
        headers: {
          'content-length': xhr.getResponseHeader('content-length') || '',
          'content-range': xhr.getResponseHeader('content-range') || '',
          'content-disposition': xhr.getResponseHeader('content-disposition') || '',
          etag: xhr.getResponseHeader('etag') || ''
        }
      })
    })
  }

  xhr.responseType = responseType
  xhr.withCredentials = withCredentials
  xhr.timeout = timeout

  const isGet = method.toUpperCase() === 'GET'
  const url = isGet && Object.keys(data).length > 0
    ? `${action}${action.includes('?') ? '&' : '?'}${buildQueryString(data)}`
    : action

  xhr.open(method, url, true)

  Object.entries(headers).forEach(([key, value]) => {
    if (value != null) {
      xhr.setRequestHeader(key, value)
    }
  })

  xhr.addEventListener('timeout', onTimeout)
  xhr.addEventListener('progress', onProgress)
  xhr.addEventListener('error', onError)
  xhr.addEventListener('readystatechange', onReadyStateChange)

  if (isGet) {
    xhr.send()
  } else {
    xhr.send(JSON.stringify(data))
  }

  result.abort = () => {
    result.canceled = true
    xhr.abort()
  }

  return result
}

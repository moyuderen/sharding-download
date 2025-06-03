export type RequestHeaders = {
  'content-length': string
  'content-range': string
  'content-disposition': string
  etag: string
  [key: string]: string | undefined
}

export type RequestResponse = {
  data: Blob | object
  status: number
  headers: RequestHeaders
}
export type RequestOptions = {
  /** 下载接口地址 */
  action: string

  /** 接口method类型 */
  method: 'POST' | 'GET' | 'post' | 'get'

  /** 自定义上传参数 */
  data: {
    url: string
    index: number
    [key: string]: any
  }

  /** 自定义headers */
  headers: {
    Range: string
    [key: string]: string
  }

  /** 接口返回类型 */
  responseType: XMLHttpRequestResponseType

  /** 跨域是否支持携带凭证 */
  withCredentials: boolean

  /** 下载进度回调 */
  onProgress: (e: ProgressEvent) => void

  /** 下载成功回调 */
  onSuccess: (response: RequestResponse) => void

  /** 下载失败回调 */
  onFail: (request: any, error: Error) => void
}

export type RequestReturn = {
  abort: () => void
  canceled?: boolean
}

export type Request = typeof request

export default function request(options: RequestOptions): RequestReturn {
  const {
    action,
    method = 'POST',
    data = {},
    headers = {},
    responseType = 'blob',
    withCredentials = true,
    onProgress = () => {},
    onSuccess = () => {},
    onFail = () => {}
  } = options

  let xhr = new XMLHttpRequest()
  xhr.responseType = responseType
  xhr.withCredentials = withCredentials
  xhr.open(method, action, true)

  // 'setRequestHeader' on 'XMLHttpRequest': The object's state must be OPENED
  if ('setRequestHeader' in xhr) {
    Object.entries({
      'content-type': 'application/json;charset=UTF-8',
      ...headers
    }).forEach(([key, value]) => xhr.setRequestHeader(key, value))
  }

  xhr.addEventListener('timeout', () => onFail(xhr, new Error('Request timed out')))
  xhr.addEventListener('progress', onProgress)
  xhr.addEventListener('error', () =>
    onFail(xhr, new Error(`Request failed with status ${xhr.status}`))
  )
  xhr.addEventListener('readystatechange', () => {
    if (xhr.readyState !== 4) return
    if (xhr.status < 200 || xhr.status >= 300) {
      onFail(xhr, new Error(`xhr: status === ${xhr.status}`))
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

  xhr.send(JSON.stringify(data))

  return {
    abort() {
      xhr.abort()
    }
  }
}

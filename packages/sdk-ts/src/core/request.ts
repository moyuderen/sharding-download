export type Response = {
  headers: Record<string, any>
  data: any
  status?: number
  config?: Record<string, any>
}

export type RequestOption = {
  action: string
  data: Record<string, any>
  headers: Record<string, string>
  onProgress?: (e: ProgressEvent) => void
  onSuccess: (response: Response) => void
  onFailed: (xhr: any, e?: any) => void
}

export type Request = (option: RequestOption) => { abort: Function }

const parseResonse = (xhr: XMLHttpRequest) => {
  return {
    status: xhr.status,
    data: xhr.response,
    headers: {
      'content-length': xhr.getResponseHeader('content-length'),
      'content-range': xhr.getResponseHeader('content-range'),
      'content-disposition': xhr.getResponseHeader('content-disposition'),
      etag: xhr.getResponseHeader('Etag')
    }
  }
}

export const request: Request = (option: RequestOption) => {
  const { action, data, headers, onProgress, onSuccess, onFailed } = option

  let xhr = new XMLHttpRequest()

  xhr.responseType = 'blob'
  xhr.withCredentials = true
  xhr.open('POST', action, true)

  const requestData: Record<string, any> = {}
  Object.keys(data).forEach((key) => {
    requestData[key] = data[key]
  })

  // 'setRequestHeader' on 'XMLHttpRequest': The object's state must be OPENED
  if ('setRequestHeader' in xhr) {
    Object.keys(headers).forEach((key) => {
      xhr.setRequestHeader(key, headers[key])
    })
  }

  xhr.addEventListener('progress', (e) => onProgress && onProgress(e))
  xhr.addEventListener('load', () => {
    if (xhr.status < 200 || xhr.status >= 300) {
      onFailed(xhr)
      return
    }

    onSuccess(parseResonse(xhr))
  })
  xhr.addEventListener('error', (e) => {
    onFailed(xhr, e)
  })

  xhr.setRequestHeader('content-type', 'application/json;charset=UTF-8')
  xhr.send(JSON.stringify(requestData))

  return {
    abort() {
      xhr.abort()
    }
  }
}

export default request

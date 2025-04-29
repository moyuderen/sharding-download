export default function request(options) {
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
        'content-length': xhr.getResponseHeader('content-length'),
        'content-range': xhr.getResponseHeader('content-range'),
        'content-disposition': xhr.getResponseHeader('content-disposition'),
        etag: xhr.getResponseHeader('etag')
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

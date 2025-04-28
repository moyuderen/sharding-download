export default function request(options) {
  const {
    action,
    method = 'POST',
    data = {},
    headers = {},
    onProgress = () => {},
    onSuccess = () => {},
    onFail = () => {}
  } = options

  const requestData = {}
  let xhr = new XMLHttpRequest()
  xhr.responseType = 'blob'
  xhr.withCredentials = true
  xhr.open(method, action, true)

  Object.keys(data).forEach((key) => {
    requestData[key] = data[key]
  })

  // 'setRequestHeader' on 'XMLHttpRequest': The object's state must be OPENED
  if ('setRequestHeader' in xhr) {
    Object.keys(headers).forEach((key) => {
      xhr.setRequestHeader(key, headers[key])
    })
  }

  xhr.setRequestHeader('content-type', 'application/json;charset=UTF-8')
  xhr.addEventListener('progress', onProgress)
  xhr.addEventListener('error', (e) => onFail(xhr, e))
  xhr.addEventListener('readystatechange', () => {
    if (xhr.readyState === 4) {
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
          etag: xhr.getResponseHeader('Etag')
        }
      })
    }
  })

  xhr.send(JSON.stringify(requestData))

  return {
    abort() {
      xhr.abort()
      xhr = null
    }
  }
}

const noop = () => {}

export default function request(options) {
  const {
    action,
    method = 'POST',
    data = {},
    headers = {},
    onProgress = noop,
    onSuccess = noop,
    onFail = noop
  } = options

  let xhr = new XMLHttpRequest()
  const requestData = {}

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
  xhr.onload = function onload() {
    if (xhr.status < 200 || xhr.status >= 300) {
      onFail(xhr)
      return
    }
    onSuccess({
      data: xhr.response,
      status: xhr.status,
      headers: {
        'Content-Type': xhr.getResponseHeader('Content-Type'),
        'Content-Range': xhr.getResponseHeader('Content-Range'),
        'Content-Disposition': xhr.getResponseHeader('Content-Disposition'),
        Etag: xhr.getResponseHeader('Etag')
      }
    })
  }

  xhr.addEventListener(
    'error',
    (e) => {
      onFail(xhr, e)
    },
    false
  )
  xhr.send(JSON.stringify(requestData))

  return {
    abort() {
      xhr.abort()
      xhr = null
    }
  }
}

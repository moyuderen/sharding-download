import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import request from '../src/core/request'
import type { RequestOptions } from '../src/core/request'

type ListenerMap = Record<string, EventListener[]>

class MockXMLHttpRequest {
  static readonly UNSENT = 0
  static readonly OPENED = 1
  static readonly HEADERS_RECEIVED = 2
  static readonly LOADING = 3
  static readonly DONE = 4

  readonly UNSENT = 0
  readonly OPENED = 1
  readonly HEADERS_RECEIVED = 2
  readonly LOADING = 3
  readonly DONE = 4

  readyState = 0
  status = 0
  response: any = null
  responseType: XMLHttpRequestResponseType = 'text'
  withCredentials = false
  timeout = 0

  listeners: ListenerMap = {}
  private _method = ''
  private _url = ''
  private _headers: Record<string, string> = {}
  private _body: any = null
  private _responseHeaders: Record<string, string> = {
    'content-length': '1024',
    'content-range': 'bytes 0-1/2048',
    'content-disposition': 'attachment; filename="test.txt"',
    etag: '"abc123"'
  }

  open(method: string, url: string) {
    this._method = method
    this._url = url
    this.readyState = MockXMLHttpRequest.OPENED
  }

  setRequestHeader(key: string, value: string) {
    this._headers[key] = value
  }

  send(body?: any) {
    this._body = body ?? null
  }

  abort() {
    this.readyState = MockXMLHttpRequest.DONE
    this.status = 0
  }

  addEventListener(event: string, listener: EventListener) {
    if (!this.listeners[event]) this.listeners[event] = []
    this.listeners[event].push(listener)
  }

  removeEventListener(event: string, listener: EventListener) {
    if (!this.listeners[event]) return
    this.listeners[event] = this.listeners[event].filter((l) => l !== listener)
  }

  getResponseHeader(name: string): string | null {
    return this._responseHeaders[name] ?? null
  }

  // ---- test helpers ----
  get method() { return this._method }
  get url() { return this._url }
  get requestHeaders() { return this._headers }
  get body() { return this._body }

  setResponseHeaders(headers: Record<string, string>) {
    this._responseHeaders = headers
  }

  listenerCount(): number {
    return Object.values(this.listeners).flat().length
  }

  /** 模拟请求成功 */
  simulateSuccess(status = 200, response: any = new Blob(['data'])) {
    this.status = status
    this.response = response
    this.readyState = MockXMLHttpRequest.DONE
    this._emit('readystatechange')
  }

  /** 模拟网络错误 */
  simulateError() {
    this.status = 0
    this.readyState = MockXMLHttpRequest.DONE
    this._emit('error')
    this._emit('readystatechange')
  }

  /** 模拟 HTTP 错误 */
  simulateHttpError(status: number) {
    this.status = status
    this.readyState = MockXMLHttpRequest.DONE
    this._emit('readystatechange')
  }

  /** 模拟超时 */
  simulateTimeout() {
    this._emit('timeout')
  }

  /** 模拟进度事件 */
  simulateProgress(loaded: number, total: number) {
    const event = { loaded, total, lengthComputable: true } as ProgressEvent
    this._emit('progress', event)
  }

  /** 模拟 abort（error + readystatechange） */
  simulateAbort() {
    this.status = 0
    this.readyState = MockXMLHttpRequest.DONE
    this._emit('error')
    this._emit('readystatechange')
  }

  private _emit(event: string, e?: any) {
    const listeners = this.listeners[event]
    if (!listeners) return
    for (const listener of [...listeners]) {
      listener(e ?? ({} as Event))
    }
  }
}

let mockXhr: MockXMLHttpRequest

function setupMock() {
  const OriginalXHR = (globalThis as any).XMLHttpRequest
  ;(globalThis as any).XMLHttpRequest = class extends MockXMLHttpRequest {
    constructor() {
      super()
      mockXhr = this
    }
  }
  return () => {
    ;(globalThis as any).XMLHttpRequest = OriginalXHR
  }
}

function baseOptions(overrides?: Partial<RequestOptions>): RequestOptions {
  return {
    action: 'https://api.example.com/download',
    data: { url: 'https://file.example.com/test.zip' },
    headers: {},
    ...overrides
  }
}

describe('request', () => {
  let cleanup: () => void

  beforeEach(() => {
    cleanup = setupMock()
  })

  afterEach(() => {
    cleanup()
  })

  // ============================================================
  // 一、请求方法与参数
  // ============================================================

  describe('请求方法', () => {
    it('默认 POST，body 为 JSON', () => {
      request(baseOptions())
      expect(mockXhr.method).toBe('POST')
      expect(mockXhr.body).toBe(JSON.stringify({ url: 'https://file.example.com/test.zip' }))
    })

    it('GET 请求 body 为 null', () => {
      request(baseOptions({ method: 'GET' }))
      expect(mockXhr.method).toBe('GET')
      expect(mockXhr.body).toBeNull()
    })

    it('method 大小写不敏感（get 也走 GET 逻辑）', () => {
      request(baseOptions({ method: 'get' }))
      expect(mockXhr.body).toBeNull()
    })

    it('GET 时 data 拼接到 URL query string', () => {
      request(baseOptions({
        method: 'GET',
        data: { url: 'https://file.example.com/test.zip', index: 3 }
      }))
      expect(mockXhr.url).toContain('url=')
      expect(mockXhr.url).toContain('index=3')
      expect(mockXhr.url).toContain('?')
    })

    it('GET 时 action 已有 ? 则用 & 拼接', () => {
      request(baseOptions({
        method: 'GET',
        action: 'https://api.example.com/download?token=abc',
        data: { url: 'https://file.example.com/test.zip' }
      }))
      expect(mockXhr.url).toContain('&url=')
    })

    it('GET 时 data 为空则不拼接参数', () => {
      request(baseOptions({ method: 'GET', data: {} as any }))
      expect(mockXhr.url).toBe('https://api.example.com/download')
    })

    it('POST 时 data 包含特殊字符应正确序列化', () => {
      request(baseOptions({
        data: { url: 'https://file.example.com/test.zip?q=1&b=2', name: '中文文件' }
      }))
      const body = JSON.parse(mockXhr.body)
      expect(body.url).toBe('https://file.example.com/test.zip?q=1&b=2')
      expect(body.name).toBe('中文文件')
    })

    it('GET 时 data 中 null/undefined 值应被过滤', () => {
      request(baseOptions({
        method: 'GET',
        data: { url: 'https://file.example.com/test.zip', empty: null, missing: undefined } as any
      }))
      expect(mockXhr.url).not.toContain('empty')
      expect(mockXhr.url).not.toContain('missing')
      expect(mockXhr.url).toContain('url=')
    })
  })

  // ============================================================
  // 二、配置项
  // ============================================================

  describe('配置项', () => {
    it('默认 responseType=blob, withCredentials=true', () => {
      request(baseOptions())
      expect(mockXhr.responseType).toBe('blob')
      expect(mockXhr.withCredentials).toBe(true)
    })

    it('应设置 timeout', () => {
      request(baseOptions({ timeout: 5000 }))
      expect(mockXhr.timeout).toBe(5000)
    })

    it('timeout 默认为 0', () => {
      request(baseOptions())
      expect(mockXhr.timeout).toBe(0)
    })

    it('应设置自定义 responseType', () => {
      request(baseOptions({ responseType: 'arraybuffer' }))
      expect(mockXhr.responseType).toBe('arraybuffer')
    })

    it('withCredentials 可设为 false', () => {
      request(baseOptions({ withCredentials: false }))
      expect(mockXhr.withCredentials).toBe(false)
    })
  })

  // ============================================================
  // 三、Headers
  // ============================================================

  describe('Headers', () => {
    it('应设置自定义 headers', () => {
      request(baseOptions({
        headers: { Range: 'bytes=0-1023', 'X-Custom': 'value' }
      }))
      expect(mockXhr.requestHeaders['Range']).toBe('bytes=0-1023')
      expect(mockXhr.requestHeaders['X-Custom']).toBe('value')
    })

    it('应过滤 undefined 的 header 值', () => {
      request(baseOptions({
        headers: { Range: 'bytes=0-1023', 'X-Empty': undefined }
      }))
      expect(mockXhr.requestHeaders['Range']).toBe('bytes=0-1023')
      expect(mockXhr.requestHeaders).not.toHaveProperty('X-Empty')
    })

    it('应过滤 null 的 header 值', () => {
      request(baseOptions({
        headers: { Range: 'bytes=0-1023', 'X-Null': null as any }
      }))
      expect(mockXhr.requestHeaders).not.toHaveProperty('X-Null')
    })

    it('空 headers 不应报错', () => {
      expect(() => request(baseOptions({ headers: {} }))).not.toThrow()
    })
  })

  // ============================================================
  // 四、成功场景
  // ============================================================

  describe('成功', () => {
    it('200 应调用 onSuccess', () => {
      const onSuccess = vi.fn()
      request(baseOptions({ onSuccess }))
      mockXhr.simulateSuccess(200)
      expect(onSuccess).toHaveBeenCalledOnce()
    })

    it('201 应调用 onSuccess', () => {
      const onSuccess = vi.fn()
      request(baseOptions({ onSuccess }))
      mockXhr.simulateSuccess(201)
      expect(onSuccess).toHaveBeenCalledOnce()
    })

    it('204 (No Content) 应调用 onSuccess', () => {
      const onSuccess = vi.fn()
      request(baseOptions({ onSuccess }))
      mockXhr.simulateSuccess(204)
      expect(onSuccess).toHaveBeenCalledOnce()
    })

    it('299 边界值应调用 onSuccess', () => {
      const onSuccess = vi.fn()
      request(baseOptions({ onSuccess }))
      mockXhr.simulateSuccess(299)
      expect(onSuccess).toHaveBeenCalledOnce()
    })

    it('onSuccess 应包含正确的 status、data、headers', () => {
      const onSuccess = vi.fn()
      const blob = new Blob(['hello'])
      request(baseOptions({ onSuccess }))
      mockXhr.simulateSuccess(200, blob)
      const res = onSuccess.mock.calls[0][0]
      expect(res.status).toBe(200)
      expect(res.data).toBe(blob)
      expect(res.headers['content-length']).toBe('1024')
      expect(res.headers['content-range']).toBe('bytes 0-1/2048')
      expect(res.headers['content-disposition']).toBe('attachment; filename="test.txt"')
      expect(res.headers.etag).toBe('"abc123"')
    })

    it('服务端未返回某些 header 时应回退为空字符串', () => {
      const onSuccess = vi.fn()
      request(baseOptions({ onSuccess }))
      mockXhr.setResponseHeaders({ 'content-length': '500' })
      mockXhr.simulateSuccess(200)
      const res = onSuccess.mock.calls[0][0]
      expect(res.headers['content-length']).toBe('500')
      expect(res.headers['content-range']).toBe('')
      expect(res.headers['content-disposition']).toBe('')
      expect(res.headers.etag).toBe('')
    })
  })

  // ============================================================
  // 五、失败场景
  // ============================================================

  describe('HTTP 错误', () => {
    it('404 应调用 onFail', () => {
      const onSuccess = vi.fn()
      const onFail = vi.fn()
      request(baseOptions({ onSuccess, onFail }))
      mockXhr.simulateHttpError(404)
      expect(onFail).toHaveBeenCalledOnce()
      expect(onFail.mock.calls[0][0].message).toContain('404')
      expect(onSuccess).not.toHaveBeenCalled()
    })

    it('500 应调用 onFail', () => {
      const onFail = vi.fn()
      request(baseOptions({ onFail }))
      mockXhr.simulateHttpError(500)
      expect(onFail).toHaveBeenCalledOnce()
      expect(onFail.mock.calls[0][0].message).toContain('500')
    })

    it('100 (信息响应) 应调用 onFail', () => {
      const onFail = vi.fn()
      request(baseOptions({ onFail }))
      mockXhr.simulateHttpError(100)
      expect(onFail).toHaveBeenCalledOnce()
    })

    it('301 (重定向) 应调用 onFail', () => {
      const onFail = vi.fn()
      request(baseOptions({ onFail }))
      mockXhr.simulateHttpError(301)
      expect(onFail).toHaveBeenCalledOnce()
    })

    it('199 (刚好低于 200) 应调用 onFail', () => {
      const onFail = vi.fn()
      request(baseOptions({ onFail }))
      mockXhr.simulateHttpError(199)
      expect(onFail).toHaveBeenCalledOnce()
    })

    it('300 (刚好等于 300) 应调用 onFail', () => {
      const onFail = vi.fn()
      request(baseOptions({ onFail }))
      mockXhr.simulateHttpError(300)
      expect(onFail).toHaveBeenCalledOnce()
    })
  })

  describe('网络错误', () => {
    it('网络断开应调用 onFail', () => {
      const onFail = vi.fn()
      request(baseOptions({ onFail }))
      mockXhr.simulateError()
      expect(onFail).toHaveBeenCalledOnce()
      expect(onFail.mock.calls[0][0].message).toContain('status 0')
    })

    it('onFail 第二个参数应为 XMLHttpRequest 实例', () => {
      const onFail = vi.fn()
      request(baseOptions({ onFail }))
      mockXhr.simulateError()
      expect(onFail.mock.calls[0][1]).toBe(mockXhr)
    })
  })

  describe('超时', () => {
    it('超时应调用 onFail 并传递超时错误', () => {
      const onFail = vi.fn()
      request(baseOptions({ onFail, timeout: 1000 }))
      mockXhr.simulateTimeout()
      expect(onFail).toHaveBeenCalledOnce()
      expect(onFail.mock.calls[0][0].message).toBe('Request timed out')
    })

    it('超时后 readystatechange 不应再次触发 onFail', () => {
      const onFail = vi.fn()
      request(baseOptions({ onFail }))
      mockXhr.simulateTimeout()
      mockXhr.simulateHttpError(0)
      expect(onFail).toHaveBeenCalledOnce()
    })
  })

  // ============================================================
  // 六、Abort / Cancel
  // ============================================================

  describe('Abort', () => {
    it('abort 后 canceled 应为 true', () => {
      const result = request(baseOptions())
      expect(result.canceled).toBe(false)
      result.abort()
      expect(result.canceled).toBe(true)
    })

    it('abort 后 onFail 应收到 "Request was aborted" 错误', () => {
      const onFail = vi.fn()
      const result = request(baseOptions({ onFail }))
      result.abort()
      mockXhr.simulateAbort()
      expect(onFail).toHaveBeenCalledOnce()
      expect(onFail.mock.calls[0][0].message).toBe('Request was aborted')
    })

    it('abort 触发 error + readystatechange 后 onFail 只调用一次', () => {
      const onFail = vi.fn()
      const result = request(baseOptions({ onFail }))
      result.abort()
      mockXhr.simulateAbort()
      expect(onFail).toHaveBeenCalledOnce()
    })

    it('多次调用 abort 不应报错', () => {
      const result = request(baseOptions())
      expect(() => {
        result.abort()
        result.abort()
        result.abort()
      }).not.toThrow()
    })

    it('未 abort 时 canceled 应始终为 false', () => {
      const result = request(baseOptions())
      mockXhr.simulateSuccess(200)
      expect(result.canceled).toBe(false)
    })

    it('abort 后再成功回调不应触发 onSuccess', () => {
      const onSuccess = vi.fn()
      const onFail = vi.fn()
      const result = request(baseOptions({ onSuccess, onFail }))
      result.abort()
      mockXhr.simulateAbort()
      mockXhr.simulateSuccess(200)
      expect(onSuccess).not.toHaveBeenCalled()
    })
  })

  // ============================================================
  // 七、双次回调防护
  // ============================================================

  describe('回调只触发一次', () => {
    it('成功后超时不触发 onFail', () => {
      const onSuccess = vi.fn()
      const onFail = vi.fn()
      request(baseOptions({ onSuccess, onFail }))
      mockXhr.simulateSuccess(200)
      mockXhr.simulateTimeout()
      expect(onSuccess).toHaveBeenCalledOnce()
      expect(onFail).not.toHaveBeenCalled()
    })

    it('失败后成功不触发 onSuccess', () => {
      const onSuccess = vi.fn()
      const onFail = vi.fn()
      request(baseOptions({ onSuccess, onFail }))
      mockXhr.simulateError()
      mockXhr.simulateSuccess(200)
      expect(onFail).toHaveBeenCalledOnce()
      expect(onSuccess).not.toHaveBeenCalled()
    })

    it('超时后 HTTP 错误不触发第二次 onFail', () => {
      const onFail = vi.fn()
      request(baseOptions({ onFail }))
      mockXhr.simulateTimeout()
      mockXhr.simulateHttpError(500)
      expect(onFail).toHaveBeenCalledOnce()
    })

    it('HTTP 错误后网络错误不触发第二次 onFail', () => {
      const onFail = vi.fn()
      request(baseOptions({ onFail }))
      mockXhr.simulateHttpError(500)
      mockXhr.simulateError()
      expect(onFail).toHaveBeenCalledOnce()
    })

    it('成功后再次模拟成功不触发第二次 onSuccess', () => {
      const onSuccess = vi.fn()
      request(baseOptions({ onSuccess }))
      mockXhr.simulateSuccess(200)
      mockXhr.simulateSuccess(200)
      expect(onSuccess).toHaveBeenCalledOnce()
    })
  })

  // ============================================================
  // 八、进度回调
  // ============================================================

  describe('进度', () => {
    it('应触发 onProgress', () => {
      const onProgress = vi.fn()
      request(baseOptions({ onProgress }))
      mockXhr.simulateProgress(512, 1024)
      expect(onProgress).toHaveBeenCalledOnce()
      expect(onProgress.mock.calls[0][0].loaded).toBe(512)
      expect(onProgress.mock.calls[0][0].total).toBe(1024)
    })

    it('未传 onProgress 时进度事件不应报错', () => {
      request(baseOptions())
      expect(() => mockXhr.simulateProgress(512, 1024)).not.toThrow()
    })

    it('多次进度事件应多次触发', () => {
      const onProgress = vi.fn()
      request(baseOptions({ onProgress }))
      mockXhr.simulateProgress(256, 1024)
      mockXhr.simulateProgress(512, 1024)
      mockXhr.simulateProgress(1024, 1024)
      expect(onProgress).toHaveBeenCalledTimes(3)
    })
  })

  // ============================================================
  // 九、事件监听器清理
  // ============================================================

  describe('事件清理', () => {
    it('成功后应移除事件监听器', () => {
      request(baseOptions())
      const before = mockXhr.listenerCount()
      mockXhr.simulateSuccess(200)
      expect(mockXhr.listenerCount()).toBeLessThan(before)
    })

    it('失败后应移除事件监听器', () => {
      request(baseOptions())
      const before = mockXhr.listenerCount()
      mockXhr.simulateError()
      expect(mockXhr.listenerCount()).toBeLessThan(before)
    })

    it('超时后应移除事件监听器', () => {
      request(baseOptions())
      const before = mockXhr.listenerCount()
      mockXhr.simulateTimeout()
      expect(mockXhr.listenerCount()).toBeLessThan(before)
    })

    it('abort 后应移除事件监听器', () => {
      const result = request(baseOptions())
      const before = mockXhr.listenerCount()
      result.abort()
      mockXhr.simulateAbort()
      expect(mockXhr.listenerCount()).toBeLessThan(before)
    })
  })

  // ============================================================
  // 十、返回值
  // ============================================================

  describe('返回值', () => {
    it('应返回 { abort, canceled }', () => {
      const result = request(baseOptions())
      expect(result).toHaveProperty('abort')
      expect(result).toHaveProperty('canceled')
      expect(typeof result.abort).toBe('function')
      expect(result.canceled).toBe(false)
    })
  })

  // ============================================================
  // 十一、默认回调安全
  // ============================================================

  describe('默认回调', () => {
    it('不传 onSuccess/onFail 时成功不应报错', () => {
      request(baseOptions({ onSuccess: undefined, onFail: undefined }))
      expect(() => mockXhr.simulateSuccess(200)).not.toThrow()
    })

    it('不传 onSuccess/onFail 时失败不应报错', () => {
      request(baseOptions({ onSuccess: undefined, onFail: undefined }))
      expect(() => mockXhr.simulateError()).not.toThrow()
    })

    it('不传 onSuccess/onFail 时超时不应报错', () => {
      request(baseOptions({ onSuccess: undefined, onFail: undefined }))
      expect(() => mockXhr.simulateTimeout()).not.toThrow()
    })
  })

  // ============================================================
  // 十二、边界情况
  // ============================================================

  describe('边界情况', () => {
    it('data 包含嵌套对象时应正确 JSON.stringify', () => {
      const data = { url: 'https://file.example.com/test.zip', meta: { page: 1 } }
      request(baseOptions({ data }))
      const body = JSON.parse(mockXhr.body)
      expect(body.meta).toEqual({ page: 1 })
    })

    it('data 包含数组时应正确 JSON.stringify', () => {
      const data = { url: 'https://file.example.com/test.zip', chunks: [0, 1, 2] }
      request(baseOptions({ data }))
      const body = JSON.parse(mockXhr.body)
      expect(body.chunks).toEqual([0, 1, 2])
    })

    it('data 包含数字和布尔值时应正确序列化', () => {
      const data = { url: 'https://file.example.com/test.zip', count: 5, flag: true }
      request(baseOptions({ data }))
      const body = JSON.parse(mockXhr.body)
      expect(body.count).toBe(5)
      expect(body.flag).toBe(true)
    })

    it('连续创建多个请求应各自独立', () => {
      const onSuccess1 = vi.fn()
      const onSuccess2 = vi.fn()
      const onFail1 = vi.fn()

      request(baseOptions({ onSuccess: onSuccess1, onFail: onFail1 }))
      const xhr1 = mockXhr

      request(baseOptions({ onSuccess: onSuccess2 }))
      const xhr2 = mockXhr

      expect(xhr1).not.toBe(xhr2)
      xhr1.simulateSuccess(200)
      xhr2.simulateHttpError(500)

      expect(onSuccess1).toHaveBeenCalledOnce()
      expect(onSuccess2).not.toHaveBeenCalled()
    })
  })
})

let uid = 0
export const generateUid = (prex = 'id') => `${prex}-${+new Date()}-${uid++}`

export const throttle = (fn: Function, wait = 300) => {
  // 上一次执行 fn 的时间
  let previous = 0
  // 将 throttle 处理结果当作函数返回
  return function (...args: any[]) {
    // 获取当前时间，转换成时间戳，单位毫秒
    let now = +new Date()
    // 将当前时间和上一次执行函数的时间进行对比
    // 大于等待时间就把 previous 设置为当前时间并执行函数 fn
    if (now - previous > wait) {
      previous = now
      // @ts-ignore
      fn.apply(this, args)
    }
  }
}

export function debounce(callback: Function, wait = 1000, immediate = false) {
  let timeoutId: number | null

  return function (...args: any) {
    // 保存调用上下文和参数
    // @ts-ignore
    // eslint-disable-next-line no-this-alias
    const context = this

    // 清除之前的定时器
    if (timeoutId) {
      clearTimeout(timeoutId)
    }

    // 立即执行（前缘触发）
    if (immediate && !timeoutId) {
      callback.apply(context, args)
    }

    // 设置新的定时器
    timeoutId = setTimeout(() => {
      if (!immediate) {
        callback.apply(context, args)
      }
      timeoutId = null
    }, wait)
  }
}

export * from './file'
export * from './support'
export * from './type-test'
export * from './asyn-pool'
export * from './object'

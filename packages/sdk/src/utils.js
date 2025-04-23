export const isSupportIndexedDB = !!window.indexedDB

export async function asyncPool(poolLimit, iterator, iteratorFn) {
  const ret = [] // 存储所有任务的Promise
  const executing = new Set() // 追踪执行中的任务

  for (const [index, element] of Array.from(iterator.entries())) {
    // 创建任务Promise并记录索引
    const itemPromise = (async () => {
      try {
        const res = await iteratorFn(element, iterator)
        return res // 确保返回结果
      } catch (error) {
        const augmentedError = new Error(`[AsyncPool] Task ${index} failed: ${error.message}`)
        augmentedError.cause = error
        augmentedError.index = index
        throw augmentedError
      }
    })()

    ret[index] = itemPromise

    // 创建清理函数用于任务完成后移除自己
    const taskPromise = itemPromise.finally(() => {
      executing.delete(taskPromise)
    })

    executing.add(taskPromise)

    // 动态扩容逻辑
    if (executing.size >= poolLimit) {
      try {
        await Promise.race(executing)
      } catch {
        //
      }

      // 网络空闲期自动提升并发数
      // if (navigator.connection?.downlink > 5) {
      //   poolLimit = Math.min(poolLimit + 2, 8)
      // }
    }
  }

  // 等待所有剩余任务完成
  try {
    await Promise.allSettled(executing)
    const settledResults = await Promise.allSettled(ret)
    const errors = settledResults
      .filter((result) => result.status === 'rejected')
      .map((result) => result.reason)

    if (errors.length > 0) {
      throw new AggregateError(
        errors,
        `[AsyncPool] 部分任务执行失败 (失败数: ${errors.length}/${ret.length})`
      )
    }

    // 返回所有成功的结果
    return settledResults.map((result) => {
      if (result.status === 'fulfilled') return result.value
      throw result.reason
    })
  } catch (error) {
    throw new Error(error)
  }
}

const typeOfTest = (value, type) => {
  const str = toString.call(value)
  return str.slice(8, -1).toLowerCase() === type
}

export const isObject = (thing) => {
  return typeOfTest(thing, 'object')
}

export const isBlob = (thing) => {
  return typeOfTest(thing, 'blob')
}

export const getBody = async (response) => {
  if (isBlob(response)) {
    try {
      const responseBlobStr = await response.text()
      const responseData = JSON.parse(responseBlobStr)
      return responseData
    } catch {
      return response
    }
  }
  if (isObject(response)) {
    return response
  }
}

export const renderSize = (value = 0) => {
  const ONE_KB = 1024
  if (null == value || value == '') {
    return '0 B'
  }
  var unitArr = new Array('B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB')
  var index = 0
  var srcsize = parseFloat(value)
  index = Math.floor(Math.log(srcsize) / Math.log(ONE_KB))
  var size = srcsize / Math.pow(ONE_KB, index)
  size = size.toFixed(2) //保留的小数位数
  return size + ' ' + unitArr[index]
}

export const getFilenameFromDisposition = (disposition) => {
  if (!disposition) return null

  // 处理多种格式：filename="...", filename*=UTF-8''..., filename=...
  let filename = null

  // 1. 处理filename="..." 或 filename=...
  const standardMatch =
    disposition.match(/filename="([^"]+)"/i) || disposition.match(/filename=([^;]+)/i)
  if (standardMatch) {
    filename = standardMatch[1].trim()
  }

  // 2. 处理filename*=UTF-8''...（编码文件名）
  const utf8Match = disposition.match(/filename\*=UTF-8''([^;]+)/i)
  if (utf8Match) {
    try {
      filename = decodeURIComponent(utf8Match[1].trim())
    } catch (e) {
      console.warn('Failed to decode UTF-8 filename:', e)
    }
  }

  return filename
}

export const throttle = (fn, wait = 300) => {
  // 上一次执行 fn 的时间
  let previous = 0
  // 将 throttle 处理结果当作函数返回
  return function (...args) {
    // 获取当前时间，转换成时间戳，单位毫秒
    let now = +new Date()
    // 将当前时间和上一次执行函数的时间进行对比
    // 大于等待时间就把 previous 设置为当前时间并执行函数 fn
    if (now - previous > wait) {
      previous = now
      fn.apply(this, args)
    }
  }
}

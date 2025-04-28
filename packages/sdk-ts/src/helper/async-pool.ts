export type Iterator = Array<any>
export type IteratorFn = (element: any, iterator: Iterator) => Promise<any>

export async function asyncPool(poolLimit = 6, iterator: Iterator, iteratorFn: IteratorFn) {
  const ret = [] // 存储所有任务的Promise
  const executing = new Set() // 追踪执行中的任务

  for (const [index, element] of Array.from(iterator.entries())) {
    // 创建任务Promise并记录索引
    const itemPromise = (async () => {
      try {
        const res = await iteratorFn(element, iterator)
        return res // 确保返回结果
      } catch (error: any) {
        const augmentedError: any = new Error(`[AsyncPool] Task ${index} failed: ${error.message}`)
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
    throw new Error(error instanceof Error ? error.message : String(error))
  }
}

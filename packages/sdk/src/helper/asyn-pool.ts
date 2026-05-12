type AsyncPoolTaskError = Error & {
  cause?: unknown
  index?: number
}

export async function asyncPool<T, R>(
  poolLimit: number,
  iterator: T[],
  iteratorFn: (item: T, list: T[]) => Promise<R>
): Promise<R[]> {
  const limit = poolLimit || 6
  const ret: Promise<R>[] = []
  const executing = new Set<Promise<unknown>>()

  for (let index = 0; index < iterator.length; index++) {
    const element = iterator[index]

    const itemPromise = (async () => {
      try {
        return await iteratorFn(element, iterator)
      } catch (error: any) {
        const augmentedError: AsyncPoolTaskError = new Error(
          `[AsyncPool] Task index ${index} failed: ${error.message}`
        )
        augmentedError.cause = error
        augmentedError.index = index
        throw augmentedError
      }
    })()

    ret[index] = itemPromise

    const taskPromise = itemPromise.finally(() => {
      executing.delete(taskPromise)
    })
    // 防止 taskPromise 的拒绝成为 unhandled rejection，错误已通过 Promise.allSettled(ret) 统一收集
    taskPromise.catch(() => {})

    executing.add(taskPromise)

    if (executing.size >= limit) {
      try {
        await Promise.race(executing)
      } catch {
        // 单个任务的错误由 Promise.allSettled 收集，此处仅用于释放并发槽位
      }
    }
  }

  const settledResults = await Promise.allSettled(ret)
  const errors = settledResults
    .filter((r): r is PromiseRejectedResult => r.status === 'rejected')
    .map((r) => r.reason as AsyncPoolTaskError)

  if (errors.length > 0) {
    const failedIndexes = errors
      .map((error) => error.index)
      .filter((index): index is number => index !== undefined)
    const failedIndexMessage = failedIndexes.length > 0
      ? `, failed indexes: ${failedIndexes.join(', ')}`
      : ''

    throw new AggregateError(
      errors,
      `[AsyncPool] 部分任务执行失败 (失败数: ${errors.length}/${ret.length}${failedIndexMessage})`
    )
  }

  return (settledResults as PromiseFulfilledResult<R>[]).map((r) => r.value)
}

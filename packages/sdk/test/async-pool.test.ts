import { describe, expect, it, vi } from 'vitest'
import { asyncPool } from '../src/helper/asyn-pool'

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// ---- 模拟分片下载的真实数据结构 ----
interface Chunk {
  index: number
  url: string
  size: number
  status: 'pending' | 'success' | 'failed'
}

function createChunks(count: number): Chunk[] {
  return Array.from({ length: count }, (_, i) => ({
    index: i,
    url: `https://example.com/file/part-${i}`,
    size: 1024,
    status: 'pending',
  }))
}

describe('asyncPool', () => {
  // ---- 基础功能 ----

  it('应按顺序返回所有任务的结果', async () => {
    const input = [1, 2, 3, 4, 5]
    const results = await asyncPool(3, input, async (item) => item * 2)
    expect(results).toEqual([2, 4, 6, 8, 10])
  })

  it('应处理空数组', async () => {
    const results = await asyncPool(3, [], async (item) => item)
    expect(results).toEqual([])
  })

  it('应处理单个元素', async () => {
    const results = await asyncPool(3, [42], async (item) => item)
    expect(results).toEqual([42])
  })

  // ---- 并发控制 ----

  it('并发数不应超过 poolLimit', async () => {
    let concurrent = 0
    let maxConcurrent = 0
    const limit = 4
    const items = Array.from({ length: 20 }, (_, i) => i)

    await asyncPool(limit, items, async () => {
      concurrent++
      maxConcurrent = Math.max(maxConcurrent, concurrent)
      await delay(30)
      concurrent--
    })

    expect(maxConcurrent).toBeLessThanOrEqual(limit)
  })

  it('poolLimit 为 1 时应串行执行', async () => {
    const order: number[] = []
    await asyncPool(
      1,
      [1, 2, 3],
      async (item) => {
        order.push(item)
        await delay(10)
      }
    )
    expect(order).toEqual([1, 2, 3])
  })

  it('poolLimit 大于数组长度时所有任务应并行执行', async () => {
    let maxConcurrent = 0
    let concurrent = 0

    await asyncPool(
      100,
      [1, 2, 3],
      async () => {
        concurrent++
        maxConcurrent = Math.max(maxConcurrent, concurrent)
        await delay(20)
        concurrent--
      }
    )

    expect(maxConcurrent).toBe(3)
  })

  // ---- 结果顺序 ----

  it('无论任务完成顺序如何，结果应保持原始顺序', async () => {
    const items = [100, 10, 200, 5]
    const results = await asyncPool(4, items, async (item) => {
      await delay(item) // 先完成的排在后面，但结果应保持原顺序
      return item
    })
    expect(results).toEqual([100, 10, 200, 5])
  })

  // ---- 参数传递 ----

  it('应将元素和原始数组传递给 iteratorFn', async () => {
    const input = ['a', 'b', 'c']
    const calls: Array<{ element: string; list: string[] }> = []

    await asyncPool(2, input, async (element, list) => {
      calls.push({ element, list })
    })

    expect(calls).toHaveLength(3)
    for (const call of calls) {
      expect(call.list).toBe(input)
      expect(input).toContain(call.element)
    }
  })

  // ---- 模拟真实分片下载场景 ----

  it('模拟分片下载：全部成功', async () => {
    const chunks = createChunks(5)
    const downloaded = new Set<number>()

    const results = await asyncPool(3, chunks, async (chunk: Chunk) => {
      // 模拟网络请求
      await delay(10)
      chunk.status = 'success'
      downloaded.add(chunk.index)
      return chunk
    })

    expect(results).toHaveLength(5)
    expect(downloaded.size).toBe(5)
    for (const chunk of results) {
      expect(chunk.status).toBe('success')
    }
  })

  it('模拟分片下载：部分 chunk 已存在，跳过下载', async () => {
    const chunks = createChunks(5)
    const downloaded = new Set<number>([1, 3]) // chunk 1 和 3 已下载
    const downloadSpy = vi.fn()

    await asyncPool(3, chunks, async (chunk: Chunk) => {
      if (downloaded.has(chunk.index)) {
        chunk.status = 'success'
        return chunk
      }
      // 模拟下载
      downloadSpy()
      await delay(10)
      chunk.status = 'success'
      downloaded.add(chunk.index)
      return chunk
    })

    // 只有 3 个 chunk 需要真正下载
    expect(downloadSpy).toHaveBeenCalledTimes(3)
    expect(downloaded.size).toBe(5)
  })

  // ---- 错误处理 ----

  it('全部任务失败时应抛出 AggregateError', async () => {
    const items = [0, 1, 2]

    try {
      await asyncPool(2, items, async () => {
        throw new Error('network error')
      })
      expect.unreachable('should have thrown')
    } catch (error: any) {
      expect(error).toBeInstanceOf(AggregateError)
      expect(error.errors).toHaveLength(3)
      expect(error.message).toContain('3/3')
    }
  })

  it('部分任务失败时应抛出包含失败详情的 AggregateError', async () => {
    const chunks = createChunks(5)

    try {
      await asyncPool(2, chunks, async (chunk: Chunk) => {
        if (chunk.index === 2 || chunk.index === 4) {
          throw new Error(`chunk ${chunk.index} download failed`)
        }
        await delay(10)
        chunk.status = 'success'
        return chunk
      })
      expect.unreachable('should have thrown')
    } catch (error: any) {
      expect(error).toBeInstanceOf(AggregateError)
      expect(error.errors).toHaveLength(2)
      expect(error.message).toContain('2/5')
      const failedIndices = error.errors.map((e: any) => e.index).sort()
      expect(failedIndices).toEqual([2, 4])
    }
  })

  it('错误应包含任务索引和原始 cause', async () => {
    const items = ['ok', 'fail', 'ok']

    try {
      await asyncPool(3, items, async (item) => {
        if (item === 'fail') throw new Error('boom')
        return item
      })
      expect.unreachable('should have thrown')
    } catch (error: any) {
      expect(error).toBeInstanceOf(AggregateError)
      const failed = error.errors[0]
      expect(failed.index).toBe(1)
      expect(failed.message).toContain('Task 1 failed')
      expect(failed.cause.message).toBe('boom')
    }
  })

  // ---- 边界情况 ----

  it('iteratorFn 返回 undefined 也应正常工作', async () => {
    const results = await asyncPool(2, [1, 2, 3], async () => {
      // 无返回值
    })
    expect(results).toEqual([undefined, undefined, undefined])
  })

  it('应使用默认 poolLimit (6)', async () => {
    let maxConcurrent = 0
    let concurrent = 0
    const items = Array.from({ length: 12 }, (_, i) => i)

    await asyncPool(0, items, async () => {
      concurrent++
      maxConcurrent = Math.max(maxConcurrent, concurrent)
      await delay(20)
      concurrent--
    })

    expect(maxConcurrent).toBeLessThanOrEqual(6)
  })
})

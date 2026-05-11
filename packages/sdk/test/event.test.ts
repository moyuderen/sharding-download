import { describe, expect, it, vi } from 'vitest'
import Event from '../src/core/Event'
import Downloader from '../src/core/Downloader'
import { Callbacks } from '../src/core/constants'

describe('Event', () => {
  it('continues dispatching remaining listeners when a listener removes itself', () => {
    const event = new Event()
    const calls: string[] = []

    const first = () => {
      calls.push('first')
      event.off('change', first)
    }
    const second = () => {
      calls.push('second')
    }

    event.on('change', first)
    event.on('change', second)

    event.emit('change')
    event.emit('change')

    expect(calls).toEqual(['first', 'second', 'second'])
  })

  it('keeps current-cycle listeners when one listener removes another listener', () => {
    const event = new Event()
    const calls: string[] = []

    const second = () => {
      calls.push('second')
    }
    const first = () => {
      calls.push('first')
      event.off('change', second)
    }
    const third = () => {
      calls.push('third')
    }

    event.on('change', first)
    event.on('change', second)
    event.on('change', third)

    event.emit('change')
    event.emit('change')

    expect(calls).toEqual(['first', 'second', 'third', 'first', 'third'])
  })

  it('removes once listener even when the callback throws', () => {
    const event = new Event()
    const error = new Error('boom')
    const listener = vi.fn(() => {
      throw error
    })

    event.once('change', listener)

    expect(() => event.emit('change')).toThrow(error)
    expect(listener).toHaveBeenCalledTimes(1)

    event.emit('change')
    expect(listener).toHaveBeenCalledTimes(1)
  })

  it('off(name, callback) removes only the target listener', () => {
    const event = new Event()
    const first = vi.fn()
    const second = vi.fn()

    event.on('change', first)
    event.on('change', second)
    event.off('change', first)
    event.emit('change')
    event.emit('change')

    expect(first).not.toHaveBeenCalled()
    expect(second).toHaveBeenCalledTimes(2)
  })

  it('off(name) clears the whole event entry', () => {
    const event = new Event()
    const listener = vi.fn()

    event.on('change', listener)
    event.off('change')
    event.emit('change')

    expect(listener).not.toHaveBeenCalled()
  })
})

describe('Downloader', () => {
  it('emits FAILED with a single trailing fileList when start url is invalid', async () => {
    const downloader = new Downloader({})
    const failedListener = vi.fn()

    downloader.on(Callbacks.FAILED, failedListener)

    await expect(downloader.start('')).rejects.toThrow('A valid URL is required')

    expect(failedListener).toHaveBeenCalledTimes(1)
    expect(failedListener.mock.calls[0]).toHaveLength(2)
    expect(failedListener.mock.calls[0][0]).toBeNull()
    expect(failedListener.mock.calls[0][1]).toBe(downloader.fileList)
    expect(failedListener.mock.calls[0][1]).toEqual([])
  })
})

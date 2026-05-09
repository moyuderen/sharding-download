import { describe, expect, it } from 'vitest'
import { deepAssign } from '../src/helper/object'

describe('deepAssign', () => {
  it('merges nested objects without mutating inputs', () => {
    const target = {
      headers: {
        accept: 'application/json'
      },
      retries: 1
    }
    const source = {
      headers: {
        authorization: 'Bearer token'
      }
    }

    const result = deepAssign(target, source)

    expect(result).toEqual({
      headers: {
        accept: 'application/json',
        authorization: 'Bearer token'
      },
      retries: 1
    })
    expect(target).toEqual({
      headers: {
        accept: 'application/json'
      },
      retries: 1
    })
    expect(source).toEqual({
      headers: {
        authorization: 'Bearer token'
      }
    })
    expect(result.headers).not.toBe(target.headers)
    expect(result.headers).not.toBe(source.headers)
  })

  it('creates a fresh nested object when the target branch is missing', () => {
    const source = {
      headers: {
        authorization: 'Bearer token'
      }
    }

    const result = deepAssign({}, source)

    expect(result).toEqual(source)
    expect(result.headers).not.toBe(source.headers)
  })

  it('replaces arrays and deep clones nested array items', () => {
    const source = {
      files: [{ id: 'c', meta: { part: 1 } }],
      options: {
        tags: ['new']
      }
    }

    const result = deepAssign(
      {
        files: [{ id: 'a' }, { id: 'b' }],
        options: {
          tags: ['old']
        }
      },
      source
    )

    expect(result).toEqual(source)
    expect(result.files).not.toBe(source.files)
    expect(result.files[0]).not.toBe(source.files[0])
    expect(result.files[0].meta).not.toBe(source.files[0].meta)
    expect(result.options.tags).not.toBe(source.options.tags)
  })

  it('replaces primitive-like values directly', () => {
    const onDone = () => 'done'
    type PrimitiveMergeCase = {
      count: number
      enabled: boolean
      name: string
      nullable: string | null
      missing: string | undefined
      onDone: () => string
    }

    const source: PrimitiveMergeCase = {
      count: 2,
      enabled: false,
      name: 'next',
      nullable: null,
      missing: undefined,
      onDone
    }

    const result = deepAssign<PrimitiveMergeCase, PrimitiveMergeCase>(
      {
        count: 1,
        enabled: true,
        name: 'prev',
        nullable: 'value',
        missing: 'value',
        onDone: () => 'old'
      },
      source
    )

    expect(result.count).toBe(2)
    expect(result.enabled).toBe(false)
    expect(result.name).toBe('next')
    expect(result.nullable).toBeNull()
    expect(result.missing).toBeUndefined()
    expect(result.onDone).toBe(onDone)
  })

  it('preserves target branches that are not overwritten', () => {
    const target = {
      request: {
        headers: {
          accept: 'application/json'
        },
        retry: {
          count: 3
        }
      },
      untouched: {
        value: 1
      }
    }

    const result = deepAssign(target, {
      request: {
        retry: {
          delay: 500
        }
      }
    })

    expect(result).toEqual({
      request: {
        headers: {
          accept: 'application/json'
        },
        retry: {
          count: 3,
          delay: 500
        }
      },
      untouched: {
        value: 1
      }
    })
    expect(result.request).not.toBe(target.request)
    expect(result.request.retry).not.toBe(target.request.retry)
    expect(result.untouched).not.toBe(target.untouched)
  })
})

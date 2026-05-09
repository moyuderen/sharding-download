import { isMergeableObject } from './type-test'

type ObjectRecord = Record<string, unknown>

export const hasOwnProperty = (source: object, key: PropertyKey) =>
  Object.prototype.hasOwnProperty.call(source, key)

const cloneValue = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map(cloneValue)
  }

  if (isMergeableObject(value)) {
    return deepAssign({}, value as ObjectRecord)
  }

  return value
}

export function deepAssign<T extends ObjectRecord, U extends ObjectRecord>(
  target: T,
  source: U
): T & U {
  const result: ObjectRecord = {}

  for (const key of Object.keys(target)) {
    result[key] = cloneValue(target[key])
  }

  for (const key of Object.keys(source)) {
    const sourceVal = source[key]
    const targetVal = result[key]

    result[key] = isMergeableObject(targetVal) && isMergeableObject(sourceVal)
      ? deepAssign(targetVal as ObjectRecord, sourceVal as ObjectRecord)
      : cloneValue(sourceVal)
  }

  return result as T & U
}

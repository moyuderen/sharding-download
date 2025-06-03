import { isPlainObject } from './type-test'
type UserObject = any

export const hasOwnProperty = (source: UserObject, key: string) =>
  Object.prototype.hasOwnProperty.call(source, key)

export function deepAssign<T, U>(target: T, source: U): T & U {
  if (!isPlainObject(source) || !isPlainObject(target)) {
    return source as T & U
  }

  // 创建 target 的深拷贝以避免修改原始对象
  const result: any = Array.isArray(target) ? [...target] : { ...target }

  // 遍历 source 的所有键
  for (const key in source) {
    if (hasOwnProperty(source, key)) {
      const sourceVal = source[key]
      const targetVal = result[key]

      // 如果 source 的值是对象（非数组且非 null）
      if (isPlainObject(sourceVal) && !Array.isArray(sourceVal)) {
        result[key] = deepAssign(targetVal, sourceVal)
      } else {
        // 直接赋值（包括数组、基本类型、null 等）
        result[key] = sourceVal
      }
    }
  }

  return result as T & U
}

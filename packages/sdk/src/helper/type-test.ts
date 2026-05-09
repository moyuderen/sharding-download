const typeOfTest = (value: any, type: string) => {
  const str = Object.prototype.toString.call(value)
  return str.slice(8, -1).toLowerCase() === type
}

export const isObject = (thing: any) => {
  return typeOfTest(thing, 'object')
}

export const isMergeableObject = (thing: any) => {
  if (thing === null || typeof thing !== 'object' || Array.isArray(thing)) {
    return false
  }

  const prototype = Object.getPrototypeOf(thing)
  return prototype === Object.prototype || prototype === null
}

export const isPlainObject = isMergeableObject

export const isBinaryData = (thing: any) => {
  return (
    (typeof Blob !== 'undefined' && thing instanceof Blob) ||
    (typeof ArrayBuffer !== 'undefined' &&
      (thing instanceof ArrayBuffer || ArrayBuffer.isView(thing)))
  )
}

export const isArray = (thing: any) => {
  if (Array.isArray) return Array.isArray(thing)
  return typeOfTest(thing, 'array')
}

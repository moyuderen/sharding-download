const typeOfTest = (value: any, type: string) => {
  const str = toString.call(value)
  return str.slice(8, -1).toLowerCase() === type
}

export const isObject = (thing: any) => {
  return typeOfTest(thing, 'object')
}

export const isPlainObject = (thing: any) => {
  return isObject(thing) && thing !== null
}

export const isBlob = (thing: any) => {
  return typeOfTest(thing, 'blob')
}

export const isArray = (thing: any) => {
  if (Array.isArray) Array.isArray(thing)
  return typeOfTest(thing, 'array')
}

import { isBinaryData, isObject } from './type-test'

const textDecoder = new TextDecoder()

const decodeBinaryData = async (binaryData: Blob | ArrayBuffer | ArrayBufferView) => {
  if (typeof Blob !== 'undefined' && binaryData instanceof Blob) {
    return binaryData.text()
  }

  return textDecoder.decode(binaryData as ArrayBuffer | ArrayBufferView)
}

export const getFilenameFromDisposition = (disposition: string): string => {
  if (!disposition) return ''

  // 处理多种格式：filename="...", filename*=UTF-8''..., filename=...
  let filename = ''

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

export const renderSize = (value: number | string) => {
  const ONE_KB = 1024
  if (null === value || value === '' || value === 0) {
    return '0 B'
  }
  const unitArr = new Array('B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB')
  let index = 0
  const srcsize = parseFloat(String(value))
  index = Math.floor(Math.log(srcsize) / Math.log(ONE_KB))
  const size = srcsize / Math.pow(ONE_KB, index)
  const sizeStr = size.toFixed(2) //保留的小数位数
  return sizeStr + ' ' + unitArr[index]
}

export const getBody = async (response: any) => {
  if (isBinaryData(response)) {
    try {
      const responseText = await decodeBinaryData(response)
      const responseData = JSON.parse(responseText)
      return responseData
    } catch {
      return response
    }
  }
  if (isObject(response)) {
    return response
  }
}

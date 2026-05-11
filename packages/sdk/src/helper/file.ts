import { isBinaryData, isObject } from './type-test'

const textDecoder = new TextDecoder()

const RE_UTF8_FILENAME = /filename\*=UTF-8''([^;]+)/i
const RE_QUOTED_FILENAME = /filename="([^"]+)"/i
const RE_UNQUOTED_FILENAME = /filename=([^;]+)/i

const UNITS = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']
const LOG_1024 = Math.log(1024)

const decodeBinaryData = async (binaryData: Blob | ArrayBuffer | ArrayBufferView) => {
  if (binaryData instanceof Blob) {
    return binaryData.text()
  }
  return textDecoder.decode(binaryData as ArrayBuffer | ArrayBufferView)
}

export const getFilenameFromDisposition = (disposition: string): string => {
  if (!disposition) return ''

  const utf8Match = disposition.match(RE_UTF8_FILENAME)
  if (utf8Match) {
    try {
      return decodeURIComponent(utf8Match[1].trim())
    } catch {
      // fall through to standard match
    }
  }

  const standardMatch = disposition.match(RE_QUOTED_FILENAME) || disposition.match(RE_UNQUOTED_FILENAME)
  return standardMatch ? standardMatch[1].trim() : ''
}

export const renderSize = (value: number | string) => {
  const num = Number(value)
  if (!num || num <= 0) return '0 B'

  const index = Math.min(Math.floor(Math.log(num) / LOG_1024), UNITS.length - 1)
  return (num / Math.pow(1024, index)).toFixed(2) + ' ' + UNITS[index]
}

export const getBody = async (response: unknown): Promise<unknown> => {
  if (isBinaryData(response)) {
    try {
      return JSON.parse(await decodeBinaryData(response as Blob | ArrayBuffer | ArrayBufferView))
    } catch {
      return response
    }
  }
  if (isObject(response)) {
    return response
  }
  return response
}

export const resolveProgress = (
  event: ProgressEvent,
  fallbackTotal: number,
  currentProgress: number
) => {
  const total = event.lengthComputable && event.total > 0 ? event.total : fallbackTotal
  if (total <= 0) return currentProgress
  return Math.min(Math.max(event.loaded / total, currentProgress), 1)
}


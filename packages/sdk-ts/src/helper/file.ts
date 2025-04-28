export const getFilenameFromDisposition = (disposition: string) => {
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

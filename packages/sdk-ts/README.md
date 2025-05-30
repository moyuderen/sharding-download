# Quick Start

## 安装

```bash
npm i sharding-downloader
```

## 使用

```javascript
import Downloader from 'sharding-downloader'

const downloader = new Downloader({
  action: 'https://sharding-download-server.vercel.app/api/file/download',
  chunkSize: 1024 * 1024 * 0.5,
  threads: 3
})
let downloadFileList = []

downloader.on(Callbacks.CHANGE, (file, fileList) => {
  downloadFileList = [...fileList]
})

downloader.on(Callbacks.SUCCESS, (file, fileList) => {
  console.log('Successful', file.link)
  window.open(file.link)
})

downloader.on(Callbacks.FAILED, (file, fileList) => {
  console.log('Failed !!!!!!', file, fileList)
})

downloader.on(Callbacks.PROGRESS, (file, fileList) => {
  console.log('progress', file.progress, fileList)
})

// 开始下载
const hanldeDownload = () => downloader.start('711.jpg')

// 重试
const handleRetry = (file) => file.retry()

// 暂停
const hanlePause = (file) => file.pause()

// 重新下载
const hanleResume = (file) => file.resume()
```

## 线上Demo

[sharding-download-demo](https://codepen.io/moyuderen/pen/YPPvJgE)

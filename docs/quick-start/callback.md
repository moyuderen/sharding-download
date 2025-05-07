---
outline: deep
---

# Callback

## Callback枚举值

```js
export const Callbacks = {
  FAILED: 'failed',
  PROGRESS: 'progress',
  SUCCESS: 'success',
  CHANGE: 'change'
}
```

## change

文件状态改变时触发

```js
let downloadFileList = []
downloader.on(Callbacks.CHANGE, (file, fileList) => {
  downloadFileList.value = [...fileList];
});
```

## success

文件下载成功时触发

```js
downloader.on(Callbacks.SUCCESS, (file, fileList) => {
  console.log(file.link)
});
```

## failed

文件下载失败时触发

```js
downloader.on(Callbacks.FAILED, (file, fileList) => {
  console.log("failed !!!!!!", file, fileList);
});
```

## progress

文件下载进度，值在`0-1`之间

```js
downloader.on(Callbacks.PROGRESS, (_file, _fileList) => {
  console.log('progress', file.progress)
});
```

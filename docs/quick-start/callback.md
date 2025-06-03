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

文件状态改变时触发, [FileItem类型](./detail#file-item)

```typescript
let downloadFileList = []
downloader.on(Callbacks.CHANGE, (file: FileItem, fileList: FileItem[]) => {
  downloadFileList.value = [...fileList];
});
```

## success

文件下载成功时触发, [FileItem类型](./detail#file-item)

```typescript
downloader.on(Callbacks.SUCCESS, (file: FileItem, fileList: FileItem[]) => {
  console.log(file.link)
});
```

## failed

文件下载失败时触发, [FileItem类型](./detail#file-item)

```typescript
downloader.on(Callbacks.FAILED, (file: FileItem, fileList: FileItem[]) => {
  console.log("failed !!!!!!", file, fileList);
});
```

## progress

文件下载进度，值在`0-1`之间, [FileItem类型](./detail#file-item)

```typescript
downloader.on(Callbacks.PROGRESS, (file: FileItem, fileList: FileItem[]) => {
  console.log('progress', file.progress)
});
```

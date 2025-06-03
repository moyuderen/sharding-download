---
outline: deep
---

# 方法

## retry

手动重试

```typescript
const handleRetry = (file: FileItem) => file.retry();
```

## pause

暂停下载

```typescript
const hanlePause = (file: FileItem) => file.pause();
```

## resume

恢复下载

```typescript
const hanleResume = (file: FileItem) => file.resume();
```

---
outline: deep
---

# 参数配置

## action

下载文件服务端接口地址

**类型** `string`

**默认值** `''`

**Mock** `https://sharding-download-server.vercel.app/api/file/download`

> [!IMPORTANT]
> 当`customRequest`配置了值时，`action`不会校验必填
>

## isPart

是否分片下载, 为`false`时不会进行分片请求和合并操作

**类型** `boolean`

**默认值** `true`

## chunkSize

文件分片大小，单位是`bit`

**类型** `number`

**默认值** `1024 * 1024 * 2`

> [!WARNING]
> `chunkSize`过小会导致分片过多，建立http请求过多导致下载慢，用户根据自己的情况可自定义大小
>

## threads

单个文件并发请求数量

**类型** `number`

**默认值** `6`

## maxRetries

文件中某个分片请求失败时的重试次数

**类型** `number`

**默认值** `3`

> [!NOTE]
> 设置的值需要大于0，小于等于0时不会进行重试
>

## retryInterval

文件中某个分片请求失败时的重试间隔

**类型** `number`

**默认值** `500`

> [!NOTE]
> `maxRetries`设置值有效时生效
>

## storageVersion

DB的versiion

**类型** `number`

**默认值** `1`

## storageName

DB的name

**类型** `string`

**默认值** `file_chunks_db`

## customRequest

自定义请求, 函数需要返回一个`abort`方法来取消当前请求

**类型** `null | (Options) => abort`

**默认值** `null`

**示例**

```typescript
type Headers = {
    Range: string  // eg: `bytes=${chunk.stardByte}-${chunk.endByte}`
}

type SuccessResponse = {
    data: Blob,
    headers: {
        'content-range': string,
        'content-disposition': string,
        'etag': string
    },
    [key: string]: any
}

type Options = {
    action: string, // 下载文件的后端接口
    data: { url: string }, // { url: string } 请求的的obs地址
    headers: Headers // { Range: `bytes=${chunk.stardByte}-${chunk.endByte}`}
    onSuccess: (response: SuccessResponse) => {},
    onFail: () => {},
    onProgress: (e) => {} // 下载进度 e.loaded 和 e.total
}


const customRequest = (options) => {
  const CancelToken = axios.CancelToken
  const source = CancelToken.source()
  const { data = {}, headers = {}, onProgress = noop, onSuccess = noop, onFail = noop } = options

  download(data, {
    headers,
    cancelToken: source.token,
    onDownloadProgress: function (progressEvent) {
      onProgress(progressEvent)
    },
  })
    .then((response: SuccessResponse) => {
      onSuccess(response)
    })
    .catch((e) => {
      console.log('error', e)
      onFail(e)
    })

  return {
    abort() {
      source.cancel('Operation canceled by the user.')
    },
  }
}
```

## requestSucceed

判断接口成功的方法

**类型** `(SuccessResponse) => boolean`

**默认值**

```js
const requestSucceed = (response) => {
  const body = await getBody(response)
  if (body.code && body.code !== '00000') {
    return false
  }
  return true
}
```

**示例**

```js
 const requestSucceed = (response) => {
    const data = await getBody(response) // 解析返回的二进制结果
    if (isBlob(data)) {
      return true
    } else {
      if(data.code !== '00000') {
        ElMessage.error(data.message || 'Error')
        return false
      } else {
        return true
      }
    }
  }
```

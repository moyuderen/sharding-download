---
outline: deep
---

# 接口示例

本文档仅说明 `server` 提供的接口使用方式。

## 1. 健康检查

### 基础信息

| 名称     | 默认值       |
| -------- | ------------ |
| 请求方式 | GET          |
| 请求地址 | /api/healthy |

### 响应结果

```text
healthy
```

## 2. 获取文件元信息 {#meta}

### 基础信息

| 名称     | 默认值                          | 说明                 |
| -------- | ------------------------------- | -------------------- |
| 请求方式 | GET                             |                      |
| 请求地址 | /api/file/getFileMeta/:filename | 使用 params 方式传参 |

### 路径参数

| 字段     | 类型   | 是否必填 | 说明     |
| -------- | ------ | -------- | -------- |
| filename | string | 必填     | 文件名称 |

### 响应结果

| 字段         | 类型   | 说明                      |
| ------------ | ------ | ------------------------- |
| size         | number | 文件大小                  |
| eTag         | string | 文件唯一标识（类似 hash） |
| lastModified | string | 最后修改时间              |
| name         | string | 文件名称                  |

```json
{
  "size": 1847928,
  "eTag": "afe35b83ccd35635b9ea7dc49ba5808c282533499275c8c811da2138c90b5b38",
  "lastModified": "2025-05-06T03:10:20.391Z",
  "name": "711.jpg"
}
```

### Curl 示例

```bash
curl "http://localhost:3100/api/file/getFileMeta/711.jpg"
```

## 3. 下载文件 {#download}

### 基础信息

| 名称     | 默认值             |
| -------- | ------------------ |
| 请求方式 | POST               |
| 请求地址 | /api/file/download |

### Request Headers

| 标头  | 是否必填 | 说明                                                                                                                            | 示例           |
| ----- | -------- | ------------------------------------------------------------------------------------------------------------------------------- | -------------- |
| Range | 否       | 按字节范围下载文件分片；不传时返回整文件，参考 [Range](https://developer.mozilla.org/zh-CN/docs/Web/HTTP/Guides/Range_requests) | `bytes=0-1024` |

### Body 参数

| 字段 | 类型   | 是否必填 | 说明     |
| ---- | ------ | -------- | -------- |
| url  | string | 必填     | 文件名称 |

请求示例：

```json
{
  "url": "711.jpg"
}
```

### Query 参数

| 字段  | 类型   | 是否必填 | 说明                      |
| ----- | ------ | -------- | ------------------------- |
| error | string | 否       | 传 `1` 时返回模拟错误结果 |

### 响应说明

#### 不传 `Range`

返回整文件流。

#### 传 `Range`

返回分片文件流，状态码为 `206 Partial Content`。

响应头：

| 标头                | 示例                                     | 说明                                                                                                                            |
| ------------------- | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Content-Range       | `bytes 0-1024/1847928`                   | 当前返回的字节范围，参考 [Content-Range](https://developer.mozilla.org/zh-CN/docs/Web/HTTP/Reference/Headers/Content-Range)     |
| Content-Length      | `1025`                                   | 当前响应体长度，参考 [Content-Length](https://developer.mozilla.org/zh-CN/docs/Web/HTTP/Reference/Headers/Content-Length)       |
| ETag                | `afe35b83ccd3b9....c8c811da2138c90b5b38` | 文件唯一标识，参考 [ETag](https://developer.mozilla.org/zh-CN/docs/Web/HTTP/Reference/Headers/ETag)                             |
| Content-Disposition | `attachment; filename*=UTF-8''711.jpg`   | 文件名信息，参考 [Content-Disposition](https://developer.mozilla.org/zh-CN/docs/Web/HTTP/Reference/Headers/Content-Disposition) |

完整响应头示例：

```text
access-control-allow-credentials: true
access-control-allow-origin: http://localhost:3100
access-control-expose-headers: Content-Range,Content-Disposition,Etag,Content-Type
connection: keep-alive
content-disposition: attachment; filename*=UTF-8''711.jpg
content-length: 1025
content-range: bytes 0-1024/1847928
content-type: application/octet-stream
date: Wed, 07 May 2025 07:55:08 GMT
etag: afe35b83ccd35635b9ea7dc49ba5808c282533499275c8c811da2138c90b5b38
keep-alive: timeout=5
vary: Origin
x-powered-by: Express
```

#### 模拟失败时

传 `?error=1` 时返回错误结果，状态码为 `200`。

```json
{
  "code": "00003",
  "message": "模拟下载失败"
}
```

### Curl 示例

#### 整文件下载

```bash
curl -X POST "http://localhost:3100/api/file/download" \
  -H "Content-Type: application/json" \
  -d '{"url":"711.jpg"}' \
  -o 711.jpg
```

#### 分片下载

```bash
curl -X POST "http://localhost:3100/api/file/download" \
  -H "Content-Type: application/json" \
  -H "Range: bytes=0-1024" \
  -d '{"url":"711.jpg"}' \
  -i
```

#### 模拟失败

```bash
curl -X POST "http://localhost:3100/api/file/download?error=1" \
  -H "Content-Type: application/json" \
  -d '{"url":"711.jpg"}'
```

## 4. Mock 接口（Vercel）

### Swagger 文档

[https://sharding-download-server.vercel.app/api/](https://sharding-download-server.vercel.app/api/)

### Base URL

[https://sharding-download-server.vercel.app](https://sharding-download-server.vercel.app)

### 可用接口

- `GET /api/healthy`
- `GET /api/file/getFileMeta/:filename`
- `POST /api/file/download`

> [!NOTE]
> 参数和响应格式参考上面的接口说明。

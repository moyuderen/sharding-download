---
outline: deep
---

# 接口示例

## 获取文件元信息

### 基础信息

| 名称     | 默认值                          | 说明               |
| -------- | ------------------------------- | ------------------ |
| 请求方式 | GET                             |                    |
| 请求地址 | /api/file/getFileMeta/:filename | 使用params方式传参 |

### 响应结果

| 字段       | 类型   | 说明                     |
| ------------ | ------ | ------------------------ |
| size         | number | 文件大小                 |
| etag         | string | 文件唯一标识（类似hash） |
| lastModified | string | 更改时间                 |
| name         | string | 文件名称                 |

```json
{
  "size": 1847928,
  "eTag": "afe35b83ccd35635b9ea7dc49ba5808c282533499275c8c811da2138c90b5b38",
  "lastModified": "2025-05-06T03:10:20.391Z",
  "name": "711.jpg"
}
```

## 获取文件流

### 基础信息

| 名称     | 默认值             |
| -------- | ------------------ |
| 请求方式 | POST               |
| 请求地址 | /api/file/download |

### Request Headers

| 标头  | 值                                                           | 示例                  |
| ----- | ------------------------------------------------------------ | --------------------- |
| Range | [Range](https://developer.mozilla.org/zh-CN/docs/Web/HTTP/Guides/Range_requests) | "Range: bytes=0-1023" |

### post请求参数

| 字段 | 类型             | 是否必填 | 说明                                    |
| ---- | ---------------- | -------- | --------------------------------------- |
| url  | string \| number | 必填     | 文件obs地址，或者业务中对应的文件id等等 |

### query请求参数（mock失败请求）

| 字段  | 类型   | 是否必填 | 说明                                      |
| ----- | ------ | -------- | ----------------------------------------- |
| error | string | 非必填   | 值传"1"时返回错误结果，否则返回正常文件流 |

### Response Headers

| 标头                | 示例                                    | 说明                                                         |
| ------------------- | --------------------------------------- | ------------------------------------------------------------ |
| Content-range       | *bytes 1-1000/288888*                   | [Content-Range](https://developer.mozilla.org/zh-CN/docs/Web/HTTP/Reference/Headers/Content-Range) |
| Content-Length      | *288888*                                | [Content-Length](https://developer.mozilla.org/zh-CN/docs/Web/HTTP/Reference/Headers/Content-Length) |
| ETag                | *afe35b83xxx...xxxxxx*                  | [ETag](https://developer.mozilla.org/zh-CN/docs/Web/HTTP/Reference/Headers/ETag) |
| Content-Disposition | *attachment; filename\*=UTF-8''711.jpg* | [Content-Disposition](https://developer.mozilla.org/zh-CN/docs/Web/HTTP/Reference/Headers/Content-Disposition) |

### 响应结果

#### 成功时返回文件流 `status` 为 `206`

#### 失败时返回结果`status`为`200`

```json
{
  "code": "00003",
  "message": "模拟文件下载错误"
}
```

#### 完整Curl示例

```bash
curl -X 'POST' \
  'http://localhost:3100/api/file/download?error=2' \
  -H 'accept: application/json' \
  -H 'Range: bytes=0-1024' \
  -H 'Content-Type: application/json' \
  -d '{
  "url": "711.jpg"
}'
```

```bash{1}
## Response status: 206,  Body: blob
## Response headers 

accept-ranges: bytes 
access-control-allow-credentials: true 
access-control-allow-origin: http://localhost:3100 
access-control-expose-headers: Content-Range,Content-Disposition,Etag,Content-Type 
connection: keep-alive 
content-disposition: attachment; filename*=UTF-8''711.jpg 
content-length: 1025 
content-range: bytes 0-1024/1847928 
content-type: application/octet-stream 
date: Wed,07 May 2025 07:55:08 GMT 
etag: afe35b83ccd35635b9ea7dc49ba5808c282533499275c8c811da2138c90b5b38 
keep-alive: timeout=5 
vary: Origin 
x-powered-by: Express 
```

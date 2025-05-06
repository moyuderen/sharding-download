# Quick Start

## 安装

```bash
npm i @tinyuploader/sdk -S
```

## 使用

使用类创建实例

```javascript
import Uploader from '@tinyuploader/sdk'

const uploader = new Uploader({
  action: 'https://jsonplaceholder.typicode.com/posts'
})

// 绑定上传的dom节点
uploader.assignBrowse(document.querySelector('.uploader-btn'))
```

使用暴露的 create 函数创建

```javascript
import { create } from '@tinyuploader/sdk'

const uploader = create({
  action: 'https://jsonplaceholder.typicode.com/posts'
})

// 绑定上传的dom节点
uploader.assignBrowse(document.querySelector('.uploader-btn'))
```

---
# https://vitepress.dev/reference/default-theme-home-page
layout: home

hero:
  name: 'Sharding Download'
  text: '大文件分片下载'
  tagline: 让下载变的更快，成功率更高！！
  actions:
    - theme: brand
      text: Quick Start
      link: /quick-start/start

features:
  - title: 大文件分片或者全部下载
    details: 支持文件分片下载，或者全部下载不走分片逻辑
  - title: 暂停、重试
    details: 支持自动重试和失败手动重试，支持暂停下载
  - title: 灵活定义
    details: 支持自定义下载地址、分片大小、请求接口、并发请求等
  - title: IndexedDB支持更大存储
    details: 支持IndexedDB存储二进制文件，可以支持更大的存储、浏览器不支持IndexedDB时会降级到内存
---

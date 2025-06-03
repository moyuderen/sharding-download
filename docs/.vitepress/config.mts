import { defineConfig } from 'vitepress'

// https://vitepress.dev/reference/site-config
export default defineConfig({
  base: '/sharding-download/',
  title: 'Sharding Download',
  description: '大文件分片下载',
  head: [['link', { rel: 'icon', href: '/favicon.ico' }]],
  lastUpdated: true,
  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    // logo: '/logo.svg',

    search: {
      provider: 'local'
    },

    nav: [
      { text: 'Home', link: '/' },
      { text: 'Quick start', link: '/quick-start/start' },
      {
        text: 'Server',
        items: [
          { text: '接口示例', link: '/server' },
          { text: 'Swagger', link: 'https://sharding-download-server.vercel.app/api' },
          {
            text: 'Github',
            link: 'https://github.com/moyuderen/sharding-download/tree/main/server'
          }
        ]
      },
      {
        text: 'Abort',
        items: [
          { text: 'FAQ', link: '/qustion' },
          {
            text: 'CHANGELOG',
            link: 'https://github.com/moyuderen/sharding-download/blob/main/packages/sdk/CHANGELOG.md'
          }
        ]
      }
    ],

    sidebar: {
      '/quick-start/': [
        {
          // text: 'Guide',
          items: [
            {
              text: '开始',
              link: '/quick-start/start'
            },
            {
              text: '参数配置',
              link: '/quick-start/config'
            },
            {
              text: '回调',
              link: '/quick-start/callback'
            },
            {
              text: '方法',
              link: '/quick-start/function'
            },
            {
              text: '说明&接口',
              link: '/quick-start/detail'
            }
          ]
        }
      ]
    },

    socialLinks: [{ icon: 'github', link: 'https://github.com/moyuderen/sharding-download' }],

    outline: {
      label: '大纲'
    }
  }
})

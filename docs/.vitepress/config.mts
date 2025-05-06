import { defineConfig } from 'vitepress'

// https://vitepress.dev/reference/site-config
export default defineConfig({
  base: '/sharding-download/',
  title: 'Sharding Download',
  description: '大文件分片下载',
  lastUpdated: true,
  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    search: {
      provider: 'local'
    },

    nav: [
      { text: 'Home', link: '/' },
      { text: 'Quick start', link: '/quick-start/start' },
      { text: 'Server', link: 'https://sharding-download-server.vercel.app/api' },
      { text: 'Q&A', link: '/question' }
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
              text: '说明',
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

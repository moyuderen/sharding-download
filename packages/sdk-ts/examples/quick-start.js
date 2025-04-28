import Downloader from '../src/index.ts'
import options from './options.ts'

const { ref } = Vue

const app = Vue.createApp({
  setup() {
    const url = ref('711.jpg')
    const urls = ref(options)
    const downloadFiles = ref([])

    const downloader = new Downloader({
      action: 'http://localhost:3100/download',
      chunkSize: 1024 * 1024 * 1
    })

    const handleDownload = () => {
      downloader.start(url.value)
    }

    return {
      url,
      urls,
      downloadFiles,
      handleDownload
    }
  }
})
app.use(ElementPlus)
app.mount('#app')

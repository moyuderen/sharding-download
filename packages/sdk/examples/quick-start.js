import Downloader from '../src/index.js'
import optionList from './options.js'

const { ref } = Vue

const app = Vue.createApp({
  setup() {
    const currentUrl = ref('711.jpg')
    const options = ref(optionList)
    const link = ref('')
    const downloadFileList = ref([])

    const downloader = new Downloader({
      action: 'http://localhost:3100/download',
      chunkSize: 1024 * 1024 * 2,
      threads: 3
      // isPart: true
    })

    downloader.on('change', (file, fileList) => {
      console.log('------ change status', file.status)
      downloadFileList.value = [...fileList]
    })

    downloader.on('success', (file, fileList) => {
      console.log('sucess', file.link)
      link.value = file.link
    })

    downloader.on('fail', (file, fileList) => {
      console.table('fail !!!!!!', file, fileList)
    })

    downloader.on('progress', (file, fileList) => {
      // console.log('progress', file.progress, fileList)
    })

    const hanldeDownload = async () => {
      link.value = ''
      downloader.start(currentUrl.value)
    }

    const openFile = async (file) => {
      console.log('open file', file)
      window.open(file.link, '_blank')
    }

    return {
      currentUrl,
      options,
      link,
      downloadFileList,
      hanldeDownload,
      openFile
    }
  }
})

app.use(ElementPlus)
app.mount('#app')

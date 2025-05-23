import Downloader, { FileStatus, Callbacks } from '../src/index.js'
import optionList from './options.js'

const { ref } = Vue

const app = Vue.createApp({
  setup() {
    const currentUrl = ref('711.jpg')
    const options = ref(optionList)
    const link = ref('')
    const downloadFileList = ref([])

    const downloader = new Downloader({
      // action: 'https://sharding-download-server.vercel.app/api/file/download',
      action: 'http://localhost:3100/api/file/download',
      chunkSize: 1024 * 1024 * 2,
      threads: 3
      // isPart: false
    })

    downloader.on(Callbacks.CHANGE, (file, fileList) => {
      // console.log('------ change status', file.status)
      downloadFileList.value = [...fileList]
    })

    downloader.on(Callbacks.SUCCESS, (file, _fileList) => {
      console.log('sucess', file.link)
      link.value = file.link
    })

    downloader.on(Callbacks.FAILED, (file, fileList) => {
      console.table('fail !!!!!!', file, fileList)
    })

    downloader.on(Callbacks.PROGRESS, (_file, _fileList) => {
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

    const handleRetry = (file) => {
      file.retry()
    }

    const hanlePause = (file) => file.pause()
    const hanleResume = (file) => file.resume()

    const customColorMethod = (status) => {
      const colorMap = {
        [FileStatus.READY]: '#409eff',
        [FileStatus.DOWNLOADING]: '#409eff',
        [FileStatus.SUCCESS]: '#67c23a',
        [FileStatus.FAILED]: '#f56c6c'
      }
      return colorMap[status] || '#409eff'
    }

    return {
      FileStatus,
      currentUrl,
      options,
      link,
      downloadFileList,
      hanldeDownload,
      openFile,
      handleRetry,
      hanlePause,
      hanleResume,
      customColorMethod
    }
  }
})

app.use(ElementPlus)
app.mount('#app')

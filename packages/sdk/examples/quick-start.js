import Downloader, { FileStatus, Callbacks } from '../src/index.js'
import { customConfig, urlOptions, actionList } from './options.js'

const { ref, reactive, watch } = Vue

const app = Vue.createApp({
  setup() {
    const currentUrl = ref('711.jpg')
    const options = ref(urlOptions)
    const config = reactive(customConfig)
    const link = ref('')
    const downloadFileList = ref([])

    const downloader = new Downloader({
      ...config,
      chunkSize: config.chunkSize * 1024 * 1024
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

    watch(
      () => config,
      (newVal) => {
        downloader.setOption({
          ...newVal,
          chunkSize: newVal.chunkSize * 1024 * 1024
        })
      },
      {
        deep: true
      }
    )
    return {
      FileStatus,
      currentUrl,
      config,
      options,
      actionList,
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

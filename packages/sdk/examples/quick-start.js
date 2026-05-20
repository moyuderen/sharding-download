import { Downloader, FileStatus, Callbacks } from '../src/index'
// import { Downloader, FileStatus, Callbacks } from '../dist/sharding-downloader.es.js'
import { customConfig, urlOptions, actionList } from './options'

const { ref, reactive, watch } = Vue

const app = Vue.createApp({
  setup() {
    const currentUrl = ref('711.jpg')
    const options = ref(urlOptions)
    const link = ref('')
    const downloadFileList = ref([])

    const headersJson = ref(JSON.stringify(customConfig.headers, null, 2))
    const dataJson = ref(JSON.stringify(customConfig.data, null, 2))
    const headersError = ref('')
    const dataError = ref('')

    const config = reactive({
      action: customConfig.action,
      method: customConfig.method || 'POST',
      isPart: customConfig.isPart,
      chunkSize: customConfig.chunkSize,
      threads: customConfig.threads,
      maxRetries: customConfig.maxRetries,
      retryInterval: customConfig.retryInterval,
      timeout: customConfig.timeout || 0,
      withCredentials: customConfig.withCredentials !== false,
      storageVersion: customConfig.storageVersion,
      storageName: customConfig.storageName
    })

    const tryParseJson = (jsonRef, errorRef, label) => {
      try {
        const value = JSON.parse(jsonRef.value)
        errorRef.value = ''
        return value
      } catch {
        errorRef.value = `${label} JSON 格式错误`
        return {}
      }
    }

    const buildDownloaderOptions = () => ({
      ...config,
      chunkSize: config.chunkSize * 1024 * 1024,
      headers: tryParseJson(headersJson, headersError, 'headers'),
      data: tryParseJson(dataJson, dataError, 'data')
    })

    const downloader = new Downloader(buildDownloaderOptions())

    downloader.on(Callbacks.CHANGE, (file, fileList) => {
      downloadFileList.value = [...fileList]
    })

    downloader.on(Callbacks.SUCCESS, (file) => {
      console.log('success', file.link)
      link.value = file.link
    })

    downloader.on(Callbacks.FAILED, (file, fileList) => {
      console.table('fail !!!!!!', file, fileList)
    })

    downloader.on(Callbacks.PROGRESS, (_file, _fileList) => {
      // progress updates
    })

    const handleDownload = async () => {
      link.value = ''
      downloader.start(currentUrl.value)
    }

    const openFile = (file) => {
      window.open(file.link, '_blank')
    }

    const handleRetry = (file) => {
      file.retry()
    }

    const handlePause = (file) => file.pause()
    const handleResume = (file) => file.resume()

    const tagType = (status) => {
      const map = {
        [FileStatus.READY]: '',
        [FileStatus.INIT]: 'info',
        [FileStatus.DOWNLOADING]: '',
        [FileStatus.DOWNLOADED]: 'success',
        [FileStatus.SUCCESS]: 'success',
        [FileStatus.FAILED]: 'danger',
        [FileStatus.CANCELLED]: 'warning'
      }
      return map[status] || 'info'
    }

    const progressColor = (percentage) => {
      if (percentage >= 100) return '#67c23a'
      return '#409eff'
    }

    watch(
      [() => config.action, () => config.method, () => config.isPart, () => config.chunkSize,
       () => config.threads, () => config.maxRetries, () => config.retryInterval,
       () => config.timeout, () => config.withCredentials, () => config.storageVersion,
       () => config.storageName, headersJson, dataJson],
      () => {
        downloader.setOption(buildDownloaderOptions())
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
      headersJson,
      dataJson,
      headersError,
      dataError,
      handleDownload,
      openFile,
      handleRetry,
      handlePause,
      handleResume,
      tagType,
      progressColor
    }
  }
})

app.use(ElementPlus)
app.mount('#app')

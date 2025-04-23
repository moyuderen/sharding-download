import Downloader from '../src/index.js'

const { ref } = Vue

Vue.createApp({
  setup() {
    const downloadFileList = ref([])

    const downloader = new Downloader({
      action: 'http://localhost:3100/download',
      chunkSize: 1024 * 1024 * 2,
      threads: 3,
      isPart: true
    })

    downloader.on('change', (file, fileList) => {
      console.log('change', file.status)
      downloadFileList.value = [...fileList]
    })

    downloader.on('success', (file, fileList) => {
      // console.log('success', file, fileList)
      console.log(file.link)
      document.querySelector('#image').src = file.link
    })

    downloader.on('fail', (file, fileList) => {
      console.log('fail !!!!!!')
    })

    downloader.on('progress', (file, fileList) => {
      console.log('progress', file.progress, fileList)
    })

    const hanldeDownload = async () => {
      document.querySelector('#image').src = ''
      // 711.jpg Discord.dmg book.pdf
      downloader.start('book.pdf')
    }

    const openFile = async (file) => {
      console.log('open file', file)
      window.open(file.link, '_blank')
    }

    return {
      downloadFileList,
      hanldeDownload,
      openFile
    }
  }
}).mount('#app')

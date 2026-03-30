import type { FlatFileMap } from '~/types/transfer'

/**
 * 首页业务仓库。
 * 负责选择文件/目录、处理拖拽和取件码跳转，避免首页脚本直接承载业务流程。
 */
export const useHomeStore = defineStore('home', () => {
  const { t } = useI18n()
  const localePath = useLocalePath()
  const router = useRouter()
  const toast = useToast()

  const appStore = useAppStore()
  const transferConfigStore = useTransferConfigStore()

  const isModernFileAPISupport = ref(true)
  const isDirSupport = ref(true)
  const receiveCode = ref('')
  const isFileDraging = ref(false)

  function initialize() {
    isModernFileAPISupport.value = isModernFileAPIAvailable()
    isDirSupport.value = supportsDirectorySelection()
    receiveCode.value = ''
    transferConfigStore.clearTransferFiles()
  }

  async function applyTransferSelection(
    type: 'transFile' | 'transDir' | 'syncDir',
    fileMap: FlatFileMap
  ) {
    if (Object.keys(fileMap).length === 0) {
      throw new Error(type === 'transFile' ? '未选择文件' : '目录为空')
    }
    transferConfigStore.setTransferFiles(type, fileMap)
    await router.push(localePath('/sender'))
  }

  async function syncDir() {
    try {
      const files = await selectDir()
      appStore.setFullScreenLoading(true)
      const fileMap = await dealFilesFormList(files)
      await applyTransferSelection('syncDir', fileMap)
    } catch (error) {
      console.warn(error)
      toast.add({ severity: 'error', summary: 'Error', detail: `${error}`, life: 5e3 })
      appStore.setFullScreenLoading(false)
    }
  }

  async function sendDir() {
    try {
      const files = await selectDir()
      appStore.setFullScreenLoading(true)
      const fileMap = await dealFilesFormList(files)
      await applyTransferSelection('transDir', fileMap)
    } catch (error) {
      console.warn(error)
      toast.add({ severity: 'error', summary: 'Error', detail: `${error}`, life: 5e3 })
      appStore.setFullScreenLoading(false)
    }
  }

  async function sendFile() {
    try {
      const file = await selectFile()
      appStore.setFullScreenLoading(true)
      await applyTransferSelection('transFile', dealFilesFormFile(file))
    } catch (error) {
      console.warn(error)
      toast.add({ severity: 'error', summary: 'Error', detail: `${error}`, life: 5e3 })
      appStore.setFullScreenLoading(false)
    }
  }

  async function handleDropFile(event: DragEvent) {
    event.preventDefault()
    isFileDraging.value = false

    if (!event.dataTransfer || event.dataTransfer.items.length === 0) {
      return
    }

    const firstItem = event.dataTransfer.items[0]
    if (!firstItem) {
      return
    }

    const item = firstItem.webkitGetAsEntry()
    const files = event.dataTransfer.files
    if (!item) {
      return
    }

    if (item.isFile) {
      const file = files[0]
      if (!file) {
        return
      }

      appStore.setFullScreenLoading(true)
      await applyTransferSelection('transFile', dealFilesFormFile(file))
      return
    }

    if (item.isDirectory) {
      toast.add({
        severity: 'warn',
        summary: 'Warn',
        detail: t('hint.noSupportFolderDrag'),
        life: 5e3
      })
    }
  }

  async function handleReceiveCodeChange() {
    if (receiveCode.value.length !== 4) {
      return
    }

    if (/^\d{4}$/.test(receiveCode.value)) {
      appStore.setFullScreenLoading(true)
      await router.push({ path: localePath('recipient'), query: { code: receiveCode.value } })
      return
    }

    receiveCode.value = receiveCode.value.replaceAll(' ', '')
  }

  function setDragging(value: boolean) {
    isFileDraging.value = value
  }

  return {
    isModernFileAPISupport,
    isDirSupport,
    receiveCode,
    isFileDraging,
    initialize,
    syncDir,
    sendDir,
    sendFile,
    handleDropFile,
    handleReceiveCodeChange,
    setDragging
  }
})

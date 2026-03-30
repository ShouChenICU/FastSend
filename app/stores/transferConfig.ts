import type { FilesPayload, FlatFileMap, TransferType } from '~/types/transfer'
import { cloneFlatFileMap } from '~/types/transfer'

/**
 * 待发送文件配置仓库。
 * 该仓库只负责保存发送前选中的文件信息，不掺杂页面展示逻辑。
 */
export const useTransferConfigStore = defineStore('transferConfig', () => {
  const type = ref<TransferType>('')
  const fileMap = ref<FlatFileMap>({})
  const root = ref('')

  const filesInfo = computed<FilesPayload>(() => ({
    type: type.value,
    fileMap: fileMap.value,
    root: root.value
  }))

  function setTransferFiles(nextType: TransferType, nextFileMap: FlatFileMap) {
    type.value = nextType
    fileMap.value = nextFileMap
    root.value = ''
  }

  function clearTransferFiles() {
    type.value = ''
    fileMap.value = {}
    root.value = ''
  }

  /**
   * 为发送端构造最终发送给接收端的载荷。
   * 目录同步场景下会自动提取根目录名，并生成去根后的文件树。
   */
  function buildSenderPayload(): FilesPayload {
    const nextFileMap = cloneFlatFileMap(fileMap.value)
    let nextRoot = root.value

    if (type.value === 'syncDir') {
      const [firstKey] = Object.keys(nextFileMap)
      if (firstKey) {
        nextRoot = nextFileMap[firstKey]?.paths[0] || 'Unknown'
      } else {
        nextRoot = 'Unknown'
      }
      return {
        type: type.value,
        root: nextRoot,
        fileMap: fileMapWithoutRoot(nextFileMap)
      }
    }

    return {
      type: type.value,
      root: nextRoot,
      fileMap: nextFileMap
    }
  }

  return {
    type,
    fileMap,
    root,
    filesInfo,
    setTransferFiles,
    clearTransferFiles,
    buildSenderPayload
  }
})
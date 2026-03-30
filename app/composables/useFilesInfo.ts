export default function useFilesInfo(type?: string, fileMap?: any) {
  const filesInfo = useState<{ type: string; fileMap: any; root: string }>('useFilesInfo', () => ({
    type: '',
    fileMap: {},
    root: ''
  }))
  if (type) {
    filesInfo.value.type = type
  }
  if (fileMap) {
    filesInfo.value.fileMap = fileMap
  }
  return filesInfo
}

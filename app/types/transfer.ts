/**
 * 传输模式。
 * 空字符串表示当前尚未选择要发送的内容。
 */
export type TransferType = '' | 'transFile' | 'transDir' | 'syncDir'

/**
 * 用户基础信息。
 */
export interface UserInfo {
  nickname: string
  avatarURL: string
}

/**
 * 单个文件的扁平化描述信息。
 */
export interface FlatFileItem {
  paths: string[]
  size: number
  lastModified: number
  file?: File
  isEqual?: boolean
  isUpdate?: boolean
}

/**
 * 扁平文件树结构。
 */
export type FlatFileMap = Record<string, FlatFileItem>

/**
 * 发送给接收端的文件信息载荷。
 */
export interface FilesPayload {
  type: TransferType
  fileMap: FlatFileMap
  root: string
}

/**
 * 通用错误/警告状态。
 */
export interface MessageState {
  code: number
  msg: string
}

/**
 * 发送端当前文件状态。
 */
export interface SenderCurrentFileState {
  name: string
  size: number
  transmittedBytes: number
  lastBytes: number
  speed: number
  startTime: number
}

/**
 * 发送端页面状态。
 */
export interface SenderStatusState {
  isIniting: boolean
  isConnectServer: boolean
  isConnectPeer: boolean
  isWaitingConnect: boolean
  isWaitingConfirm: boolean
  isDone: boolean
  error: MessageState
  warn: MessageState
}

/**
 * 接收端当前文件状态。
 */
export interface RecipientCurrentFileState {
  name: string
  size: number
  transmittedBytes: number
  lastSize: number
  speed: number
  chunks: ArrayBuffer[]
}

/**
 * 接收端页面状态。
 */
export interface RecipientStatusState {
  isConnectServer: boolean
  isConnectPeer: boolean
  isPeerConnecting: boolean
  isIniting: boolean
  isWaitingPeerConfirm: boolean
  isLock: boolean
  isReceiving: boolean
  isDone: boolean
  error: MessageState
  warn: MessageState
}

/**
 * 目录同步阶段状态。
 */
export interface SyncDirState {
  folderName: string
  isWaitingSelectDir: boolean
  isDiffing: boolean
  fileMapAdd: FlatFileMap
  fileMapUpdate: FlatFileMap
  fileMapDelete: FlatFileMap
  addKeys: Record<string, boolean>
  updateKeys: Record<string, boolean>
  deleteKeys: Record<string, boolean>
  waitAddList: string[]
  waitUpdateList: string[]
  waitDeleteList: string[]
}

/**
 * 构造默认错误/警告状态。
 */
export function createMessageState(): MessageState {
  return {
    code: 0,
    msg: ''
  }
}

/**
 * 构造默认发送端文件状态。
 */
export function createSenderCurrentFileState(): SenderCurrentFileState {
  return {
    name: '',
    size: 0,
    transmittedBytes: 0,
    lastBytes: 0,
    speed: 0,
    startTime: 0
  }
}

/**
 * 构造默认发送端状态。
 */
export function createSenderStatusState(): SenderStatusState {
  return {
    isIniting: true,
    isConnectServer: false,
    isConnectPeer: false,
    isWaitingConnect: true,
    isWaitingConfirm: true,
    isDone: false,
    error: createMessageState(),
    warn: createMessageState()
  }
}

/**
 * 构造默认接收端文件状态。
 */
export function createRecipientCurrentFileState(): RecipientCurrentFileState {
  return {
    name: '',
    size: 0,
    transmittedBytes: 0,
    lastSize: 0,
    speed: 0,
    chunks: []
  }
}

/**
 * 构造默认接收端状态。
 */
export function createRecipientStatusState(): RecipientStatusState {
  return {
    isConnectServer: false,
    isConnectPeer: false,
    isPeerConnecting: false,
    isIniting: true,
    isWaitingPeerConfirm: true,
    isLock: false,
    isReceiving: false,
    isDone: false,
    error: createMessageState(),
    warn: createMessageState()
  }
}

/**
 * 构造默认目录同步状态。
 */
export function createSyncDirState(): SyncDirState {
  return {
    folderName: '',
    isWaitingSelectDir: true,
    isDiffing: true,
    fileMapAdd: {},
    fileMapUpdate: {},
    fileMapDelete: {},
    addKeys: {},
    updateKeys: {},
    deleteKeys: {},
    waitAddList: [],
    waitUpdateList: [],
    waitDeleteList: []
  }
}

/**
 * 浅拷贝文件树，保留 File 引用，复制数组结构，避免在发送前污染原始状态。
 */
export function cloneFlatFileMap(fileMap: FlatFileMap): FlatFileMap {
  const result: FlatFileMap = {}
  for (const [key, value] of Object.entries(fileMap)) {
    result[key] = {
      ...value,
      paths: [...value.paths]
    }
  }
  return result
}
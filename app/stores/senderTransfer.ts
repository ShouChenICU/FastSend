import CryptoJS from 'crypto-js'
import { toCanvas } from 'qrcode'
import { PeerDataChannel } from '~/utils/PeerDataChannel'
import {
  createSenderCurrentFileState,
  createSenderStatusState,
  type SenderCurrentFileState,
  type SenderStatusState,
  type UserInfo
} from '~/types/transfer'

/**
 * 发送端业务仓库。
 * 所有发送流程状态、连接控制和文件发送动作都集中在这里，页面仅负责绑定展示。
 */
export const useSenderTransferStore = defineStore('senderTransfer', () => {
  const { t } = useI18n()
  const localePath = useLocalePath()
  const router = useRouter()
  const toast = useToast()

  const appStore = useAppStore()
  const userStore = useUserStore()
  const transferConfigStore = useTransferConfigStore()

  const peerUserInfo = ref<UserInfo>({ nickname: 'unknown', avatarURL: '' })
  const code = ref('')
  const totalTransmittedBytes = ref(0)
  const startTime = ref(0)
  const totalSpeed = ref(0)
  const durationTimeStr = ref('0:00:00')
  const curFile = ref<SenderCurrentFileState>(createSenderCurrentFileState())
  const status = ref<SenderStatusState>(createSenderStatusState())

  let calcSpeedJobId: ReturnType<typeof setInterval> | undefined
  let ws: WebSocket | null = null
  let pdc: PeerDataChannel | null = null
  const hasher = CryptoJS.algo.MD5.create()
  // syncDir 场景下，payload 中的键是去根后的，需要映射回原始文件项
  let payloadFileMap: Record<string, { file?: File }> = {}

  const shareLink = computed(() => {
    if (!import.meta.client || !code.value) {
      return ''
    }
    return `${location.origin}${localePath('/recipient')}?code=${code.value}`
  })

  function resetState() {
    dispose()
    peerUserInfo.value = { nickname: 'unknown', avatarURL: '' }
    code.value = ''
    totalTransmittedBytes.value = 0
    startTime.value = 0
    totalSpeed.value = 0
    durationTimeStr.value = '0:00:00'
    curFile.value = createSenderCurrentFileState()
    status.value = createSenderStatusState()
    payloadFileMap = {}
  }

  function dispose() {
    if (calcSpeedJobId) {
      clearInterval(calcSpeedJobId)
      calcSpeedJobId = undefined
    }
    ws?.close()
    ws = null
    pdc?.dispose()
    pdc = null
  }

  function calcSpeedFn() {
    if (!startTime.value) {
      return
    }
    totalSpeed.value =
      totalTransmittedBytes.value / ((new Date().getTime() - startTime.value) / 1e3)
    durationTimeStr.value = formatTime(new Date().getTime() - startTime.value)
  }

  async function confirmUser(isTrust: boolean) {
    if (!isTrust) {
      await pdc?.sendData(JSON.stringify({ type: 'err', data: 403 }))
      await router.replace(localePath('/'))
      return
    }

    status.value.isWaitingConfirm = false
    await pdc?.sendData(JSON.stringify({ type: 'user', data: userStore.userInfo }))

    const payload = transferConfigStore.buildSenderPayload()

    // syncDir 场景下 payload 的键已经去根，需要建立去根键到原始文件项的映射
    if (transferConfigStore.type === 'syncDir') {
      payloadFileMap = {}
      const originalFileMap = transferConfigStore.fileMap
      for (const payloadKey of Object.keys(payload.fileMap)) {
        for (const [origKey, origItem] of Object.entries(originalFileMap)) {
          if (origKey.replace(/.*?\//, '') === payloadKey) {
            payloadFileMap[payloadKey] = origItem
            break
          }
        }
      }
    } else {
      payloadFileMap = transferConfigStore.fileMap
    }

    await pdc?.sendData(JSON.stringify({ type: 'files', data: payload }))
  }

  async function handleObjData(obj: any) {
    if (obj.type === 'user') {
      peerUserInfo.value = obj.data
      status.value.isWaitingConnect = false
      if (userStore.isConfirmDefault) {
        await confirmUser(true)
      }
      return
    }

    if (obj.type === 'reqFile') {
      hasher.reset()
      const fileDetail = payloadFileMap[obj.data]
      const file = fileDetail?.file
      const name = `${fileDetail?.paths[fileDetail?.paths?.length - 1] || ''}`

      if (!file) {
        await pdc?.sendData(JSON.stringify({ type: 'err', data: 404 }))
        return
      }

      curFile.value = {
        name,
        size: file.size,
        transmittedBytes: 0,
        lastBytes: 0,
        speed: 0,
        startTime: new Date().getTime()
      }

      const sliceSize = 1024 * 1024
      const count = Math.ceil(file.size / sliceSize)
      for (let index = 0; index < count; index++) {
        const ab = await file.slice(index * sliceSize, (index + 1) * sliceSize).arrayBuffer()
        if (ab.byteLength === 0) {
          continue
        }

        hasher.update(CryptoJS.lib.WordArray.create(ab))
        await pdc?.sendData(ab)

        curFile.value.lastBytes = curFile.value.transmittedBytes
        curFile.value.transmittedBytes += ab.byteLength
        totalTransmittedBytes.value += ab.byteLength

        const nowTime = new Date().getTime()
        const elapsed = nowTime - curFile.value.startTime
        // 防止时间差为零导致除零异常
        if (elapsed > 0) {
          curFile.value.speed = (curFile.value.speed + ab.byteLength / (elapsed / 1e3)) / 2
        }
        curFile.value.startTime = nowTime
      }

      await pdc?.sendData(
        JSON.stringify({
          type: 'fileDone',
          data: hasher.finalize().toString(CryptoJS.enc.Base64)
        })
      )
      return
    }

    if (obj.type === 'calcFileHash') {
      hasher.reset()
      const fileDetail = payloadFileMap[obj.data]
      const file = fileDetail?.file
      if (!file) {
        await pdc?.sendData(JSON.stringify({ type: 'err', data: 404 }))
        return
      }
      const hash = await calcMD5(file)
      await pdc?.sendData(JSON.stringify({ type: 'fileHash', data: hash }))
      return
    }

    if (obj.type === 'done') {
      status.value.isDone = true
      dispose()
      toast.add({
        severity: 'success',
        summary: 'Success',
        detail: t('hint.transCompleted'),
        life: 5e3
      })
      return
    }

    if (obj.type === 'err' && obj.data) {
      status.value.warn.code = obj.data
    }
  }

  function initPDC() {
    pdc = new PeerDataChannel({ iceServers: pubIceServers })
    pdc.onSDP = (sdp) => ws?.send(JSON.stringify({ type: 'sdp', data: sdp }))
    pdc.onICECandidate = (candidate) =>
      ws?.send(JSON.stringify({ type: 'candidate', data: candidate }))
    pdc.onDispose = () => {
      status.value.isConnectPeer = false
      dispose()
      toast.add({ severity: 'warn', summary: 'Warn', detail: 'Disconnected', life: 5e3 })
      if (!status.value.isDone && status.value.warn.code === 0) {
        status.value.warn.code = -10
      }
    }
    pdc.onError = (err) => {
      console.error(err)
      status.value.isConnectPeer = false
      dispose()
    }
    pdc.onConnected = () => {
      status.value.isConnectPeer = true
      status.value.isWaitingConfirm = true
    }
    pdc.onReceive = async (data) => {
      if (typeof data === 'string') {
        await handleObjData(JSON.parse(data))
      }
    }
  }

  async function copyLink() {
    if (!shareLink.value) {
      return
    }
    await copyToClipboard(shareLink.value)
    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: 'Code copied successfully',
      life: 3e3
    })
  }

  async function renderQRCode(canvas: HTMLCanvasElement | null) {
    if (!canvas || !shareLink.value) {
      return
    }
    await toCanvas(canvas, shareLink.value, { scale: 5 })
  }

  function initialize() {
    resetState()
    appStore.setFullScreenLoading(false)

    if (!transferConfigStore.type) {
      router.replace(localePath('/'))
      return
    }

    if (Object.keys(transferConfigStore.fileMap).length === 0) {
      toast.add({ severity: 'warn', summary: 'Warn', detail: '目录为空', life: 5e3 })
      router.replace(localePath('/'))
      return
    }

    try {
      ws = new WebSocket(location.origin.replace('http', 'ws') + '/api/connect')
    } catch (error) {
      console.error(error)
      status.value.error.code = -5
      status.value.error.msg = `${error}`
      return
    }

    ws.onopen = () => {
      status.value.isConnectServer = true
      startTime.value = Date.now()
      calcSpeedJobId = setInterval(calcSpeedFn, 1e3)
      ws?.send(JSON.stringify({ type: 'send' }))
    }
    ws.onmessage = async (event) => {
      const data = JSON.parse(event.data)
      if (data.type === 'code') {
        code.value = data.code
        initPDC()
        status.value.isIniting = false
        return
      }
      if (data.type === 'sdp') {
        await pdc?.setRemoteSDP(data.data)
        return
      }
      if (data.type === 'candidate') {
        await pdc?.addICECandidate(data.data)
        return
      }
      if (data.type === 'err') {
        status.value.error.code = data.data
        status.value.isWaitingConnect = false
        toast.add({ severity: 'error', summary: 'Error', detail: data.msg, life: 5e3 })
        console.warn(data.msg)
      }
    }
    ws.onclose = () => {
      status.value.isConnectServer = false
      if (status.value.isIniting) {
        status.value.error.code = -5
        status.value.error.msg = 'Connect sign server error'
        toast.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Connect sign server error',
          life: 5e3
        })
      } else if (status.value.isWaitingConnect) {
        status.value.error.code = -10
        status.value.error.msg = 'Timeout'
      }
    }
    ws.onerror = (error) => {
      console.error(error)
      status.value.isConnectServer = false
    }
  }

  function cleanup() {
    dispose()
  }

  return {
    peerUserInfo,
    code,
    totalTransmittedBytes,
    startTime,
    totalSpeed,
    durationTimeStr,
    curFile,
    status,
    shareLink,
    initialize,
    cleanup,
    confirmUser,
    copyLink,
    renderQRCode
  }
})

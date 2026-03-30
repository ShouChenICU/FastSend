/**
 * PeerDataChannel 配置类
 */
interface PeerDataChannelConfig {
  iceServers?: RTCIceServer[]
  blockSize?: number
  initializeDataChannel?: boolean
}

/**
 * 封装用于点对点数据传输的 WebRTC 数据通道
 */
export class PeerDataChannel {
  private static readonly DEFAULT_BLOCK_SIZE = 32768

  private pc: RTCPeerConnection
  private dc: RTCDataChannel | null = null
  private receiveData: {
    startTime: number
    offset: number
    count: number
    type: string
    chunks: (string | ArrayBuffer)[]
  } = { startTime: 0, offset: 0, count: 0, type: '', chunks: [] }
  private sendPromiseReject: ((reason?: any) => void) | null = null
  private eventQueue: EventQueue<ArrayBuffer | string>
  private blockSize: number

  public onReceive: (
    data: ArrayBuffer | string,
    info: { size: number; duration: number }
  ) => Promise<void> = async () => {}
  public onSDP: (sdp: RTCSessionDescriptionInit) => void = () => {}
  public onICECandidate: (candidate: RTCIceCandidate) => void = () => {}
  public onError: (e: Error) => void = () => {}
  public onConnected: () => void = () => {}
  public onDispose: () => void = () => {}
  public onOpen: () => void = () => {}

  /**
   * 创建一个新的 PeerDataChannel 实例
   * @param config 配置
   */
  constructor(config: PeerDataChannelConfig = {}) {
    this.blockSize = config.blockSize || PeerDataChannel.DEFAULT_BLOCK_SIZE
    this.eventQueue = new EventQueue(this.onData.bind(this))
    this.pc = new RTCPeerConnection({ iceServers: config.iceServers })

    this.setupPeerConnection()

    if (config.initializeDataChannel) {
      this.initializeDataChannel()
    }
  }

  private setupPeerConnection(): void {
    this.pc.ondatachannel = this.handleDataChannel.bind(this)
    this.pc.onnegotiationneeded = this.reNegotiation.bind(this)
    this.pc.onicecandidate = (e) => e.candidate && this.onICECandidate(e.candidate)
    this.pc.onicecandidateerror = (e) => {
      // console.warn(e)
      // ingore
    }
    this.pc.onconnectionstatechange = this.handleConnectionStateChange.bind(this)
  }

  private handleDataChannel(e: RTCDataChannelEvent): void {
    this.dc = e.channel
    this.setupDataChannel()
  }

  private initializeDataChannel(): void {
    this.dc = this.pc.createDataChannel('dc')
    this.setupDataChannel()
  }

  private setupDataChannel(): void {
    if (!this.dc) return
    this.dc.bufferedAmountLowThreshold = 0
    this.dc.onmessage = (e) => this.eventQueue.enqueue(e.data)
    this.dc.onopen = () => this.onOpen()
  }

  private handleConnectionStateChange(): void {
    if (['closed', 'disconnected', 'failed'].includes(this.pc.connectionState)) {
      this.dispose()
      this.onDispose()
    } else if (this.pc.connectionState === 'connected') {
      this.onConnected()
    }
  }

  private async onData(data: ArrayBuffer | string): Promise<void> {
    const receiveData = this.receiveData
    if (receiveData.offset === receiveData.count) {
      const dat = JSON.parse(data as string)
      this.receiveData = {
        startTime: Date.now(),
        offset: 0,
        count: dat.count,
        type: dat.type,
        chunks: []
      }
    } else {
      receiveData.chunks.push(data)
      receiveData.offset++
      if (receiveData.offset === receiveData.count) {
        const endTime = Date.now()
        const b = new Blob(receiveData.chunks)
        const result = receiveData.type === 'string' ? await b.text() : await b.arrayBuffer()
        await this.onReceive(result, {
          size: b.size,
          duration: endTime - receiveData.startTime
        })
        receiveData.chunks = []
      }
    }
  }

  /**
   * 发送数据，注意只能串行调用
   * @param data 要发送的数据
   */
  public async sendData(data: ArrayBuffer | string): Promise<void> {
    if (!this.dc) {
      throw new Error('Data channel not initialized')
    }

    return new Promise<void>((resolve, reject) => {
      this.sendPromiseReject = reject
      const dc = this.dc!
      dc.bufferedAmountLowThreshold = 0
      const count = Math.ceil(
        (typeof data === 'string' ? data.length : data.byteLength) / this.blockSize
      )
      let offset = 0

      dc.onbufferedamountlow = () => {
        if (count - offset > 16) {
          dc.bufferedAmountLowThreshold = 16 * this.blockSize
        } else {
          dc.bufferedAmountLowThreshold = 0
        }
        for (let i = 0; i < 32; i++) {
          if (offset < count) {
            const chunk = data.slice(this.blockSize * offset, this.blockSize * (offset + 1))
            dc.send(<string>chunk)
            offset++
            if (offset >= count) {
              resolve()
              break
            }
          }
        }
      }
      dc.send(JSON.stringify({ count, type: typeof data }))
    })
  }

  /**
   * 重协商 SDP
   */
  private async reNegotiation(): Promise<void> {
    return this.pc
      .createOffer()
      .then((offer) => this.pc.setLocalDescription(offer))
      .then(() => (this.pc.localDescription ? this.onSDP(this.pc.localDescription) : undefined))
      .catch((e) => {
        console.error(e)
        this.onError(e instanceof Error ? e : new Error('Unknown error during renegotiation'))
        this.dispose()
      })
  }

  /**
   * 设置远程 SDP
   * @param sdp SDP描述
   */
  public async setRemoteSDP(sdp: RTCSessionDescriptionInit): Promise<void> {
    try {
      await this.pc.setRemoteDescription(sdp)
      if (sdp.type === 'offer') {
        const answer = await this.pc.createAnswer()
        await this.pc.setLocalDescription(answer)
        this.onSDP(answer)
      }
    } catch (e) {
      console.error(e)
      this.onError(e instanceof Error ? e : new Error('Error setting remote SDP'))
      this.dispose()
    }
  }

  /**
   * 添加一个 ICE candidate
   * @param candidate ICE candidate
   */
  public async addICECandidate(candidate: RTCIceCandidateInit): Promise<void> {
    await this.pc.addIceCandidate(candidate)
  }

  /**
   * 检查连接是否断开
   * @returns 如果连接则为 True，否则为 false
   */
  public isConnected(): boolean {
    return this.pc.connectionState === 'connected'
  }

  /**
   * 获取接收缓存的大小
   * @returns 接收缓存的大小
   */
  public getReceivedBufferSize(): number {
    return this.receiveData.chunks.reduce(
      (size, dat) => size + (typeof dat === 'string' ? dat.length : dat.byteLength),
      0
    )
  }

  /**
   * 关闭对等连接并清理资源
   */
  public dispose(): void {
    if (this.sendPromiseReject) {
      this.sendPromiseReject()
      this.sendPromiseReject = null
    }

    if (this.dc) {
      this.dc.close()
      this.dc = null
    }

    this.pc.onicecandidate = null
    this.pc.ontrack = null
    this.pc.ondatachannel = null
    this.pc.oniceconnectionstatechange = null
    this.pc.onsignalingstatechange = null
    this.pc.onicegatheringstatechange = null
    this.pc.onnegotiationneeded = null
    this.pc.close()
  }
}

export class EventQueue<T> {
  private tail: Promise<void> = Promise.resolve()
  private handler: (e: T) => Promise<void>

  constructor(handler: (e: T) => Promise<void>) {
    this.handler = handler
  }

  public enqueue(e: T): void {
    // 每次把新任务链到上一个任务后面
    this.tail = this.tail
      .then(() => this.handler(e))
      .catch((error) => {
        console.error('Error processing event:', error)
      })
  }
}

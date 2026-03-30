import { TTLCache } from '@isaacs/ttlcache'
import { increaseTransCount } from '../utils/TransCount'

// 客户端待初始化连接池，key是peer的id
const initPool = new TTLCache<string, any>({
  max: 8192,
  ttl: 600e3,
  dispose: (peer) => {
    if (!peer.isInited) {
      // 如果超时未初始化，则断开连接
      peer.close()
    }
  }
})

// 待连接连接池
// key为：连接ID
const waitConnectPool = new TTLCache<string, any>({
  max: 20000,
  ttl: 600e3,
  dispose: (peer) => {
    if (!peer.pairPeer) {
      peer.close()
    }
  }
})

// 已配对连接池
const initedPool = new TTLCache<string, any>({
  max: 20000,
  ttl: 30 * 60e3,
  dispose: (peer) => {
    peer.close()
  }
})

// 断开并清理连接
function disposePeer(peer: any) {
  initPool.delete(peer.id)
  initedPool.delete(peer.id)
  peer.close()
  if (peer.pairPeer && peer.pairPeer.readyState === 1) {
    disposePeer(peer.pairPeer)
  }
}

// 心跳检测，避免掉线
function heartbeat(peer: any) {
  peer.send(JSON.stringify({ type: 'ping' }))
  if (peer.readyState === 1) {
    setTimeout(() => {
      heartbeat(peer)
    }, 5e3)
  }
}

// 初始化发送端
function initSend(peer: any) {
  if (peer.isInited) {
    return
  }
  let code = genDigitCode(4)
  let retryCount = 2048
  while (waitConnectPool.has(code)) {
    if (retryCount-- <= 0) {
      peer.send(JSON.stringify({ type: 'err', data: -1, msg: 'Init code fail' }))
      throw new Error('Init code fail')
    }
    // 碰撞时重新生成取件码
    code = genDigitCode(4)
  }
  waitConnectPool.set(code, peer)
  peer.isInited = true
  initPool.delete(peer.id)
  // 初始化发送端成功，返回连接码
  peer.send(JSON.stringify({ type: 'code', code: code }))
  heartbeat(peer)
}

// 初始化接收端
function initReceive(peer: any, code: string) {
  if (peer.pairPeer) {
    // throw new Error('Already paired')
    return
  }
  const targetPeer = waitConnectPool.get(code)
  if (!targetPeer || targetPeer.pairPeer) {
    peer.send(JSON.stringify({ type: 'status', code: 404 }))
    disposePeer(peer)
    return
  }
  targetPeer.pairPeer = peer
  peer.pairPeer = targetPeer

  waitConnectPool.delete(code)

  peer.isInited = true
  initedPool.set(peer.id, peer)
  initPool.delete(peer.id)
  initedPool.set(targetPeer.id, targetPeer)
  // 配对成功
  peer.send(JSON.stringify({ type: 'status', code: 0 }))
  heartbeat(peer)
  increaseTransCount()
}

export default defineWebSocketHandler({
  open(peer) {
    console.log(`${new Date().toISOString()} open: #${peer.id}`)
    initPool.set(peer.id, peer)
  },

  close(peer) {
    console.log(`${new Date().toISOString()} close: #${peer.id}`)
    disposePeer(peer)
  },

  message(peer: any, msg) {
    try {
      const data = JSON.parse(msg.text())
      if (data.type === 'send') {
        // 发送端初始化
        initSend(peer)
      } else if (data.type === 'receive') {
        // 接收端初始化
        if (/^\d{4}$/.test(data.code)) {
          initReceive(peer, data.code)
        } else {
          // 如果code不是4位数字，则断开
          disposePeer(peer)
        }
      } else if (peer.pairPeer) {
        peer.pairPeer.send(msg.text())
      } else {
        disposePeer(peer)
      }
    } catch (e) {
      // console.warn(e)
      disposePeer(peer)
    }
  },

  error(peer, error) {
    console.warn(error)
    disposePeer(peer)
  }
})

function genDigitCode(length: number): string {
  if (length <= 0) {
    throw new Error('长度必须大于0')
  }

  let code = ''

  for (let i = 0; i < length; i++) {
    // 生成一个0到9之间的随机整数
    const digit = Math.floor(Math.random() * 10)
    // 将数字拼接到字符串中
    code += digit
  }

  return code
}

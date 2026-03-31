# FastSend - Project Structure

## Directory Layout

```
FastSend/
├── app/                        # Nuxt 4 frontend application (srcDir)
│   ├── assets/main.css         # Global Tailwind CSS entry
│   ├── components/             # Shared Vue components
│   ├── composables/            # Vue composables (useXxx pattern)
│   ├── pages/                  # Route pages: index, sender, recipient
│   ├── stores/                 # Pinia stores (one per domain)
│   ├── types/                  # TypeScript types and factory functions
│   ├── utils/                  # Pure utilities and WebRTC core
│   ├── app.config.ts           # Nuxt app config (currently empty)
│   └── app.vue                 # Root Vue component
├── server/                     # Nitro server (signaling + API)
│   ├── api/
│   │   ├── connect.ts          # WebSocket signaling handler
│   │   ├── getIP.post.ts       # Client IP lookup endpoint
│   │   └── transCount.post.ts  # Transfer counter endpoint
│   └── utils/TransCount.ts     # Persistent transfer counter (file-based)
├── public/                     # Static assets + PWA service worker
│   └── sw.js                   # Custom injectManifest service worker
├── presets/aura/               # PrimeVue unstyled theme preset (Aura)
├── i18n/i18n.config.ts         # i18n messages (en + zh)
├── nuxt.config.ts              # Nuxt configuration
├── tailwind.config.js          # Tailwind configuration
└── Dockerfile / docker-compose.yaml
```

## Core Components

### Pages

- `index.vue` — Home: file/folder picker, transfer mode selection
- `sender.vue` — Sender flow: QR code, connection status, transfer progress
- `recipient.vue` — Recipient flow: code entry, file acceptance, download

### Stores (Pinia, Setup Store style)

- `app.ts` — Global UI state (full-screen loader)
- `user.ts` — User nickname/avatar, confirm-default preference
- `transferConfig.ts` — Selected files/folders, transfer type, file map building
- `senderTransfer.ts` — Full sender WebSocket + WebRTC lifecycle and file sending
- `recipientTransfer.ts` — Full recipient WebSocket + WebRTC lifecycle and file receiving
- `home.ts` — Home page UI state

### Utils

- `PeerDataChannel.ts` — WebRTC RTCPeerConnection + RTCDataChannel wrapper with chunked send/receive and an EventQueue for serial async processing
- `files.ts` — File system helpers (directory reading, flat map building, diff)
- `index.ts` — Shared utilities (formatBytes, formatTime, copyToClipboard, etc.)
- `publicStunList.ts` — Public STUN/TURN server list (`pubIceServers`)

### Server

- `connect.ts` — WebSocket signaling: manages three TTLCache pools (init, waitConnect, inited), pairs sender/receiver, relays SDP and ICE candidates
- `TransCount.ts` — Simple file-persisted counter incremented on each successful pairing

## Architectural Patterns

### Signaling Flow

1. Sender opens WebSocket → sends `{type:"send"}` → server returns 4-digit code
2. Recipient opens WebSocket → sends `{type:"receive", code:"XXXX"}` → server pairs them
3. All subsequent messages (SDP offer/answer, ICE candidates) are relayed transparently by the server
4. Once WebRTC connects, the WebSocket is no longer needed for data

### Data Transfer Protocol

- `PeerDataChannel.sendData` prepends a JSON header `{count, type}` then sends data in 32 KB blocks
- Receiver reassembles chunks via `EventQueue` (serial promise chain) before calling `onReceive`
- File integrity verified with MD5 hash sent after each file

### State Management

- Each page has a dedicated store that owns the full connection lifecycle
- Stores expose `initialize()` and `cleanup()` called from page `onMounted`/`onUnmounted`
- Reactive state (`ref`) drives UI; computed properties derive display values

# FastSend - Development Guidelines

## Code Formatting

- Prettier config: `semi:false`, `singleQuote:true`, `printWidth:100`, `trailingComma:"none"`, `tabWidth:2`
- No semicolons; single quotes for strings; trailing commas omitted everywhere
- Max line width 100 characters

## TypeScript Conventions

- Strict TypeScript throughout; avoid `any` except at explicit integration boundaries (WebRTC peer objects, legacy file API)
- Use `@ts-ignore` only with an inline comment explaining why (e.g., incomplete browser type definitions)
- Prefer explicit return types on public class methods; omit on simple arrow functions
- Use `type` for union/alias types, `interface` for object shapes
- Factory functions (e.g., `createSenderStatusState()`) are co-located with their types in `app/types/transfer.ts`

## Vue / Nuxt Patterns

- All pages use `<script setup lang="ts">` (Composition API)
- Auto-imports are enabled for composables, stores, and Nuxt utilities — do not manually import `ref`, `computed`, `defineStore`, `useI18n`, `useRouter`, etc.
- Stores are imported via auto-import by their exported function name (e.g., `useAppStore()`)
- Use `import.meta.client` to guard browser-only code in SSR context; check `typeof window === 'undefined'` in utilities
- `useLocalePath` + `router.replace(localePath('/'))` for programmatic navigation with i18n

## Pinia Store Pattern (Setup Store)

All stores use the **setup store** style — `defineStore('name', () => { ... })`:

```ts
export const useMyStore = defineStore('myStore', () => {
  // reactive state
  const value = ref<MyType>(createMyType())

  // private mutable variables (not reactive, not returned)
  let ws: WebSocket | null = null

  // always provide resetState() and dispose()
  function resetState() { dispose(); value.value = createMyType() }
  function dispose() { ws?.close(); ws = null }

  // expose only what pages need
  return { value, resetState, dispose }
})
```

- `resetState()` calls `dispose()` then resets all `ref` values using factory functions
- `dispose()` clears intervals, closes WebSocket, calls `pdc?.dispose()`, nulls all mutable refs
- Pages call `initialize()` in `onMounted` and `cleanup()` (which calls `dispose()`) in `onUnmounted`
- Only expose state and actions that pages actually need in the `return` object

## WebRTC / PeerDataChannel Usage

```ts
// Sender creates PDC without initializeDataChannel
pdc = new PeerDataChannel({ iceServers: pubIceServers })

// Recipient creates PDC with initializeDataChannel: true
pdc = new PeerDataChannel({ iceServers: pubIceServers, initializeDataChannel: true })

// Wire up callbacks before any SDP exchange
pdc.onSDP = (sdp) => ws?.send(JSON.stringify({ type: 'sdp', data: sdp }))
pdc.onICECandidate = (candidate) => ws?.send(JSON.stringify({ type: 'candidate', data: candidate }))
pdc.onConnected = () => { /* update status */ }
pdc.onDispose = () => { /* handle disconnect */ }
pdc.onReceive = async (data) => { /* handle string or ArrayBuffer */ }

// Send data (must be called serially — await each call)
await pdc.sendData(JSON.stringify({ type: 'user', data: userInfo }))
await pdc.sendData(arrayBuffer)
```

- Always use `pubIceServers` from `~/utils/publicStunList` for ICE configuration
- `sendData` must be called serially (one at a time); it is not safe to call concurrently
- Always call `pdc.dispose()` in the store's `dispose()` function

## Signaling Protocol (WebSocket Messages)

JSON messages over WebSocket to `/api/connect`:

| Direction     | Message                         | Meaning                              |
| ------------- | ------------------------------- | ------------------------------------ |
| Client→Server | `{type:"send"}`                 | Register as sender, get 4-digit code |
| Client→Server | `{type:"receive", code:"XXXX"}` | Register as recipient                |
| Server→Client | `{type:"code", code:"XXXX"}`    | Sender's pairing code                |
| Server→Client | `{type:"status", code:0}`       | Pairing successful                   |
| Server→Client | `{type:"status", code:404}`     | Code not found                       |
| Relayed       | `{type:"sdp", data:...}`        | SDP offer/answer                     |
| Relayed       | `{type:"candidate", data:...}`  | ICE candidate                        |

## P2P Data Protocol (over RTCDataChannel)

Messages sent via `pdc.sendData()`:

| Direction        | Message                             | Meaning                |
| ---------------- | ----------------------------------- | ---------------------- |
| Sender→Recipient | `{type:"user", data:UserInfo}`      | User info exchange     |
| Sender→Recipient | `{type:"files", data:FilesPayload}` | File manifest          |
| Sender→Recipient | `{type:"fileDone", data:md5Base64}` | File complete + hash   |
| Recipient→Sender | `{type:"reqFile", data:key}`        | Request a file by key  |
| Recipient→Sender | `{type:"calcFileHash", data:key}`   | Request MD5 of a file  |
| Sender→Recipient | `{type:"fileHash", data:md5Base64}` | MD5 response           |
| Either           | `{type:"err", data:code}`           | Error code             |
| Recipient→Sender | `{type:"done"}`                     | All transfers complete |

## File Map (FlatFileMap) Convention

Keys are slash-separated relative paths (e.g., `"folder/sub/file.txt"`).
Values are `FlatFileItem`: `{ paths: string[], size: number, lastModified: number, file?: File }`.

```ts
// Build from directory handle
const fileMap = await dealFilesFromHandler(dirHandle)

// Build from file list (webkitdirectory input)
const fileMap = await dealFilesFormList(fileList)

// Build from single file
const fileMap = dealFilesFormFile(file)
```

## Error Handling Patterns

- Errors are stored in `status.value.error` (blocking) or `status.value.warn` (non-blocking) as `MessageState { code, msg }`
- Code `0` means no error; non-zero codes are shown in the UI
- Always show user feedback via `toast.add({ severity, summary, detail, life: 5e3 })`
- `console.error` for unexpected errors; `console.warn` for expected/recoverable situations
- Swallow ICE candidate errors silently (they are expected in some network environments)

## SSR Safety

- Guard all browser API access: `typeof window === 'undefined'`, `import.meta.client`
- File System Access API (`showDirectoryPicker`, `showSaveFilePicker`) requires HTTPS and is only available client-side
- `localStorage` access must be wrapped in SSR checks

## Styling

- Use Tailwind utility classes for layout and spacing
- PrimeVue components are **unstyled** — styled via the Aura preset in `presets/aura/`
- Dark mode uses the `class` strategy (`dark` class on `<html>`); managed by `@nuxtjs/color-mode`
- Custom color tokens (`primary-*`, `surface-*`) are CSS variables bridged into Tailwind via `tailwind.config.js`

## i18n

- All user-visible strings must have entries in both `en` and `zh` in `i18n/i18n.config.ts`
- Use `const { t } = useI18n()` in stores and components; reference keys like `t('hint.transCompleted')`
- Navigation uses `useLocalePath()` to prefix routes with locale

## Server-Side Conventions

- WebSocket handler uses `defineWebSocketHandler` (Nitro H3)
- Three TTLCache pools manage connection lifecycle: `initPool` → `waitConnectPool` → `initedPool`
- All peer objects are plain objects with duck-typed properties (`peer.id`, `peer.pairPeer`, `peer.isInited`)
- `increaseTransCount()` is called exactly once per successful pairing in `initReceive()`
- The `transCount` file is persisted to disk on every increment (simple file-based persistence)

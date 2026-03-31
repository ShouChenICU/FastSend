# FastSend - Technology Stack

## Runtime & Language

- **Node.js** — server runtime (Nitro/H3)
- **TypeScript** — used throughout (`app/`, `server/`, config files)
- **Vue 3** (^3.5.31) — Composition API with `<script setup>`
- **Nuxt 4** (^4.4.2) — full-stack framework; `srcDir: 'app'`

## Frontend

| Technology         | Version | Role                                          |
| ------------------ | ------- | --------------------------------------------- |
| Vue 3              | ^3.5.31 | UI framework                                  |
| Pinia              | ^3.0.4  | State management                              |
| PrimeVue           | ^4.5.4  | UI component library (unstyled + Aura preset) |
| Tailwind CSS       | ^3.4.17 | Utility-first styling                         |
| @nuxtjs/i18n       | ^10.2.4 | Bilingual (en/zh)                             |
| @nuxtjs/color-mode | ^4.0.0  | Dark/light mode                               |
| @vite-pwa/nuxt     | ^1.1.1  | PWA + service worker                          |
| @nuxtjs/seo        | ^5.1.0  | SEO meta tags                                 |
| webrtc-adapter     | ^9.0.4  | WebRTC cross-browser shim                     |
| qrcode             | ^1.5.4  | QR code generation                            |
| crypto-js          | ^4.2.0  | MD5 file integrity hashing                    |

## Server (Nitro)

| Technology                              | Role                                            |
| --------------------------------------- | ----------------------------------------------- |
| Nitro (built into Nuxt 4)               | Server engine with experimental WebSocket       |
| H3 WebSocket (`defineWebSocketHandler`) | Signaling server                                |
| @isaacs/ttlcache                        | TTL-based connection pools                      |
| Node.js `fs`                            | Persistent transfer counter (`transCount` file) |

## Build & Tooling

- **Package manager**: Yarn 1.22.22 (classic)
- **Formatter**: Prettier 3.x — `semi:false`, `singleQuote:true`, `printWidth:100`, `trailingComma:"none"`, `tabWidth:2`
- **TypeScript**: strict mode via `tsconfig.json`
- **Docker**: multi-stage `Dockerfile` + `docker-compose.yaml`

## Development Commands

```bash
yarn install          # Install dependencies
yarn dev              # Dev server (--host, accessible on LAN)
yarn build            # Production build → .output/
yarn generate         # Static generation
yarn preview          # Preview production build
node .output/server/index.mjs  # Run production server
```

## Docker

```bash
docker build -t fastsend .
docker run -d --name fastsend -p 3000:3000 fastsend
docker-compose up -d
```

## Key Configuration

- `nuxt.config.ts` — `srcDir:'app'`, Nitro experimental WebSocket, PrimeVue unstyled with Aura preset, PWA injectManifest strategy
- `tailwind.config.js` — dark mode via `class`, custom `primary-*` and `surface-*` CSS variable colors bridging PrimeVue tokens
- `i18n/i18n.config.ts` — inline messages for `en` and `zh` locales
- `.prettierrc.json` — project-wide formatting rules

## Browser APIs Used

- `RTCPeerConnection` / `RTCDataChannel` — WebRTC P2P
- `showDirectoryPicker` / `showSaveFilePicker` — File System Access API (HTTPS only)
- `BeforeInstallPromptEvent` — PWA install prompt
- Service Worker (`public/sw.js`) — PWA caching with injectManifest

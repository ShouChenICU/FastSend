# FastSend - Product Overview

## Purpose

FastSend is a browser-based peer-to-peer file transfer tool built on WebRTC. It enables direct, encrypted file sharing between browsers without uploading files to a server. The signaling server only facilitates connection establishment; actual data flows directly between peers.

## Value Proposition

- Zero file storage on server — files never leave the sender's browser until received by the peer
- Works across LAN and WAN; LAN connections are automatically optimized for speed
- No account or installation required — accessible via browser at fastsend.ing
- Installable as a PWA for lightweight offline-capable access

## Key Features

- **File transfer**: Send individual files peer-to-peer
- **Directory transfer**: Send entire folder structures preserving hierarchy
- **Directory sync**: Diff two directories and transfer only added/updated/deleted files
- **End-to-end encryption**: WebRTC DTLS encryption on all data channels
- **QR code sharing**: Share connection codes via QR for mobile pairing
- **Bilingual UI**: Full Chinese and English interface (i18n)
- **Dark/light mode**: System-preference-aware color scheme
- **PWA support**: Installable, with service worker caching

## Target Users

- Developers and power users transferring files between devices on LAN
- Users needing quick cross-device file sharing without cloud storage
- Teams doing directory synchronization without a dedicated sync tool

## Use Cases

1. Send a large file from desktop to laptop on the same network
2. Sync a project directory from one machine to another
3. Share files with a mobile device by scanning a QR code
4. Transfer files across the internet when no shared cloud storage is available

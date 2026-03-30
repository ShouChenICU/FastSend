declare global {
  interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
  }

  interface Window {
    showDirectoryPicker: () => Promise<FileSystemDirectoryHandle>
    showSaveFilePicker: (options?: SaveFilePickerOptions) => Promise<FileSystemFileHandle>
  }
}

export {}

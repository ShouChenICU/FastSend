/**
 * 全局界面状态仓库。
 * 这里只保存跨页面共享的 UI 状态，避免组件之间通过 useState 隐式耦合。
 */
export const useAppStore = defineStore('app', () => {
  const isFullScreenLoading = ref(true)
  const deferredPrompt = shallowRef<BeforeInstallPromptEvent | null>(null)

  function setFullScreenLoading(value: boolean) {
    isFullScreenLoading.value = value
  }

  function setDeferredPrompt(event: BeforeInstallPromptEvent | null) {
    deferredPrompt.value = event
  }

  function clearDeferredPrompt() {
    deferredPrompt.value = null
  }

  return {
    isFullScreenLoading,
    deferredPrompt,
    setFullScreenLoading,
    setDeferredPrompt,
    clearDeferredPrompt
  }
})
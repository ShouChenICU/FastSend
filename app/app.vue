<script setup lang="ts">
useSeoMeta({
  ogTitle: 'Fast Send',
  ogType: 'website',
  ogImage: 'https://fastsend.ing/ogImg.webp',
  twitterCard: 'summary_large_image',
  twitterTitle: 'Fast Send',
  twitterDescription: 'Fast peer-to-peer file and directory transfers',
  twitterImage: 'https://fastsend.ing/ogImg.webp',
  twitterSite: '@ShouChen_',
  twitterCreator: '@ShouChen_'
})

const appStore = useAppStore()

onMounted(() => {
  window.addEventListener('beforeinstallprompt', (event) => {
    appStore.setDeferredPrompt(event as BeforeInstallPromptEvent)
  })
  appStore.setFullScreenLoading(false)

  fetch('/banner.txt')
    .then((res) => res.text())
    .then(console.log)
})
</script>

<template>
  <NuxtPwaManifest />
  <NuxtRouteAnnouncer />
  <FullScreenLoader />
  <Toast position="top-right" />
  <NavBar />
  <NuxtPage />
  <AppFooter />
  <ScrollTop />
  <InstallPWA />
  <DocPanel />
</template>

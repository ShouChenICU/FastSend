<script lang="ts" setup>
const isPWA = ref(false)
const appStore = useAppStore()
const { deferredPrompt } = storeToRefs(appStore)

function installPWA() {
  deferredPrompt.value?.prompt()
}

onMounted(() => {
  isPWA.value = isStandalone()
})
</script>

<template>
  <div class="fixed right-5 bottom-36 z-40" v-if="!isPWA && deferredPrompt">
    <Button
      text
      raised
      rounded
      severity="contrast"
      size="large"
      class="shadow-sm shadow-black/25 border-0 dark:border border-white/25"
      aria-label="Install PWA"
      @click="installPWA"
    >
      <Icon name="ic:outline-install-mobile" class="text-black/90 dark:text-white/90" />
    </Button>
  </div>
</template>

<style></style>

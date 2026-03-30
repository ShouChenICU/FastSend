<script setup lang="ts">
const { t } = useI18n()
const toast = useToast()
const homeStore = useHomeStore()
const { isModernFileAPISupport, isDirSupport, receiveCode, isFileDraging } = storeToRefs(homeStore)
const fileDragArea = ref()

const { data: transCount, error: transCountError } = await useFetch('/api/transCount', {
  method: 'post'
})

useSeoMeta({
  title: t('home')
})

const syncDir = homeStore.syncDir
const sendDir = homeStore.sendDir
const sendFile = homeStore.sendFile

watch(isFileDraging, (val) => {
  if (val) {
    fileDragArea.value.style.display = 'flex'
    fileDragArea.value.style.opacity = '1'
  } else {
    fileDragArea.value.style.opacity = '0'
    setTimeout(() => {
      if (fileDragArea.value) {
        fileDragArea.value.style.display = 'none'
      }
    }, 300)
  }
})

watch(transCountError, (error) => {
  if (!error) {
    return
  }
  toast.add({
    severity: 'error',
    summary: 'Error',
    detail: t('hint.serviceUnavailable')
  })
})

function fileDragOver(e: Event) {
  e.preventDefault()
  homeStore.setDragging(true)
}

function fileDrop(e: DragEvent) {
  homeStore.handleDropFile(e).catch(console.warn)
}

watch(receiveCode, () => homeStore.handleReceiveCodeChange(), { flush: 'sync' })

onMounted(() => {
  homeStore.initialize()

  window.ondragenter = (e) => {
    e.preventDefault()
    homeStore.setDragging(true)
  }
  window.ondragleave = (e: DragEvent) => {
    e.preventDefault()
    if (!e.relatedTarget) {
      homeStore.setDragging(false)
    }
  }
  window.ondragover = (e) => {
    e.preventDefault()
  }
  window.ondrop = (e) => {
    e.preventDefault()
    homeStore.setDragging(false)
  }
})
</script>

<template>
  <div class="md:px-[10vw] pb-4">
    <div
      class="fixed top-0 left-0 right-0 bottom-0 inset-0 -z-50 h-full w-full bg-white dark:bg-zinc-950 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] dark:bg-[radial-gradient(#25272b_1px,transparent_1px)] [background-size:16px_16px]"
    ></div>
    <div class="py-6 px-8 text-center">
      <h1 class="md:text-6xl text-5xl tracking-wider font-serif">Fast Send</h1>
      <p
        class="mt-4 leading-6 tracking-widest text-sm md:text-base text-gray-600 dark:text-gray-200"
      >
        {{ $t('description') }}
      </p>
    </div>

    <p
      class="text-xs md:text-sm text-neutral-600 dark:text-neutral-400 p-4"
      v-show="!isModernFileAPISupport"
    >
      <span class="text-red-500">*</span>{{ $t('hint.noModernFileAPIWarn') }}
    </p>

    <div class="md:grid md:grid-cols-2 gap-4 my-6 px-4">
      <div class="flex flex-col items-center relative px-4 py-8">
        <!-- 拖放指示 -->
        <div
          ref="fileDragArea"
          @dragover="fileDragOver"
          @drop="fileDrop"
          class="file-drag-area absolute left-0 top-0 right-0 bottom-0 flex-col items-center justify-center rounded-lg bg-white/60 dark:bg-black/60 backdrop-blur-sm border border-dashed border-neutral-500 z-40"
        >
          <Icon name="solar:file-send-linear" size="48" />
          <p class="mt-4">{{ $t('label.dragHereToSendFile') }}</p>
        </div>

        <h2 class="text-2xl tracking-wider flex flex-row items-center gap-2">
          <Icon name="solar:card-send-linear" />{{ $t('label.quickStart') }}
        </h2>

        <Button
          outlined
          rounded
          class="block w-full tracking-wider mt-6"
          severity="contrast"
          @click="sendFile"
          ><Icon name="solar:file-line-duotone" class="mr-2" />{{ $t('btn.sendFile') }}</Button
        >
        <Button
          outlined
          rounded
          class="block w-full tracking-wider mt-6"
          severity="contrast"
          :disabled="!isDirSupport"
          @click="sendDir"
          ><Icon name="solar:folder-with-files-line-duotone" class="mr-2" />{{
            $t('btn.sendDir')
          }}</Button
        >
        <Button
          rounded
          class="block w-full tracking-wider mt-6"
          severity="contrast"
          :disabled="!isModernFileAPISupport"
          @click="syncDir"
          ><Icon name="solar:refresh-square-broken" class="mr-2" />{{ $t('btn.syncDir') }}</Button
        >
      </div>

      <div
        class="flex flex-col items-center space-y-6 md:space-y-12 mt-8 md:mt-0 px-4 md:py-8 py-0"
      >
        <h2 class="text-2xl tracking-wider flex flex-row items-center gap-2">
          <Icon name="solar:card-recive-linear" />{{ $t('label.receiveCode') }}
        </h2>

        <InputOtp integerOnly v-model:model-value="receiveCode" class="gap-4">
          <template #default="{ attrs, events, index }">
            <input
              :autofocus="index === 1"
              type="number"
              v-bind="attrs"
              v-on="events"
              class="border border-neutral-500/70 rounded bg-neutral-50 dark:bg-zinc-900 focus:outline-none size-14 text-2xl text-center no-arrows"
            />
          </template>
        </InputOtp>
      </div>
    </div>

    <div class="flex flex-row items-baseline justify-center pt-8 text-sm">
      <span>{{ $t('label.transmitted') }}</span>
      <span class="text-2xl m-2 tracking-wider">{{ transCount }}</span>
      <span>{{ $t('label.times') }}</span>
    </div>
  </div>
</template>

<style>
.file-drag-area {
  display: none;
  opacity: 0;
  transition-property: opacity;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
  transition-duration: 300ms;
}
</style>

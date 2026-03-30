<script setup lang="ts">
const { t } = useI18n()
const localePath = useLocalePath()
const senderStore = useSenderTransferStore()
const { peerUserInfo, code, totalTransmittedBytes, totalSpeed, durationTimeStr, curFile, status } =
  storeToRefs(senderStore)
const qrcodeElm = ref()
const formatSize = humanFileSize

useSeoMeta({
  title: t('sender')
})

const confirmUser = senderStore.confirmUser
const copyLink = senderStore.copyLink

watch(code, () => {
  if (!code.value) {
    return
  }
  setTimeout(() => {
    senderStore.renderQRCode(qrcodeElm.value)
  }, 1)
})

onMounted(() => {
  senderStore.initialize()
})

onUnmounted(() => {
  senderStore.cleanup()
})
</script>

<template>
  <div>
    <!-- 错误页面 -->
    <div v-if="status.error.code !== 0">
      <!-- 当前连接用户太多 -->
      <div v-if="status.error.code === -1" class="text-center">
        <Icon name="material-symbols-light:account-circle-off-outline-rounded" size="100" />
        <p class="text-xl tracking-wider py-8">{{ t('hint.toManyPeople') }}</p>
      </div>

      <!-- 其他服务异常 -->
      <div v-else class="text-center">
        <Icon name="solar:sad-square-line-duotone" size="100" />
        <p class="text-xl tracking-wider pt-8">{{ t('hint.serverError') }}</p>
        <p class="text-sm tracking-wider pb-8 mt-2">({{ t('hint.closeTheProxy') }})</p>
      </div>

      <div class="text-center py-4">
        <NuxtLink :to="localePath('/')">
          <Button severity="contrast" class="tracking-wider"
            ><Icon name="solar:home-2-linear" class="mr-2" />{{ t('btn.toHome') }}</Button
          ></NuxtLink
        >
      </div>
    </div>

    <!-- 加载页面 -->
    <div v-else-if="status.isIniting" class="flex flex-col gap-4 items-center justify-center py-20">
      <div class="loader"></div>
      <p class="text-xs">{{ t('hint.connecting') }}</p>
    </div>

    <!-- 等待链接 -->
    <div v-else-if="status.isWaitingConnect" class="mt-4 mb-16">
      <div class="md:mx-[10vw] p-4 text-center">
        <p class="text-xl tracking-wider">{{ t('label.receiveCode') }}</p>
        <p
          class="mt-6 inline-block text-6xl md:text-7xl tracking-widest border py-4 px-8 border-dashed border-neutral-400 dark:border-neutral-500"
        >
          {{ code }}
        </p>
      </div>

      <!-- 二维码和复制链接按钮 -->
      <div class="flex flex-col items-center justify-center gap-4">
        <canvas ref="qrcodeElm" class="size-52"></canvas>
        <Button size="small" severity="contrast" @click="copyLink" class="tracking-wider"
          ><Icon name="solar:link-minimalistic-2-linear" class="mr-2" />{{
            t('btn.copyLink')
          }}</Button
        >
      </div>
    </div>

    <!-- 连接成功 -->
    <div v-else>
      <!-- 接入的用户 -->
      <div class="flex flex-col items-center mt-4">
        <div class="flex-col items-center py-4 px-8 rounded-lg shadow flex">
          <Avatar shape="circle" size="xlarge" :image="peerUserInfo.avatarURL" class="shadow" />
          <p class="text-center mt-2">{{ peerUserInfo.nickname }}</p>
        </div>
      </div>

      <!-- 业务异常 -->
      <div
        v-if="status.warn.code !== 0"
        class="flex flex-col items-center justify-center py-10 gap-4"
      >
        <Icon
          name="material-symbols-light:warning-outline-rounded"
          size="96"
          class="text-amber-500 dark:text-amber-600"
        />
        <p v-if="status.warn.code === -1" class="text-xl tracking-wider">
          {{ t('hint.noSupportDirTrans2') }}
        </p>
        <p v-else-if="status.warn.code === -10" class="text-xl tracking-wider">
          {{ t('hint.connectInterrupted') }}
        </p>

        <div class="text-center py-4">
          <NuxtLink :to="localePath('/')">
            <Button severity="contrast" class="tracking-wider"
              ><Icon name="solar:home-2-linear" class="mr-2" />{{ t('btn.toHome') }}</Button
            ></NuxtLink
          >
        </div>
      </div>

      <!-- 传输确认 -->
      <div v-else-if="status.isWaitingConfirm" class="p-4 mt-6">
        <p class="text-center text-2xl tracking-wider">{{ t('hint.areYouSureContinue') }}</p>
        <div class="flex flex-row items-center justify-center gap-6 mt-8">
          <Button outlined severity="danger" @click="confirmUser(false)" class="tracking-wider"
            ><Icon name="solar:close-square-linear" class="mr-2" />{{ t('btn.cancel') }}</Button
          >

          <Button severity="contrast" @click="confirmUser(true)" class="tracking-wider"
            ><Icon name="solar:check-square-linear" class="mr-2" />{{ t('btn.ok') }}</Button
          >
        </div>
      </div>

      <!-- 发送端主界面 -->
      <div v-else-if="!status.isDone" class="p-4 mt-4 md:w-[50%] md:mx-auto">
        <p class="text-center text-xl tracking-wider my-4">{{ t('hint.inTransit') }}</p>

        <div class="mt-8">
          <p class="text-sm mt-2">{{ curFile.name }}</p>
          <ProgressBar
            :value="
              Math.round(curFile.size === 0 ? 0 : (curFile.transmittedBytes / curFile.size) * 100)
            "
          />
          <p class="text-right text-sm">
            <span>{{ formatSize(curFile.speed) }}/s</span
            ><span class="ml-4">{{ formatSize(curFile.transmittedBytes) }}</span
            ><span class="mx-1">/</span><span>{{ formatSize(curFile.size) }}</span>
          </p>
        </div>

        <div class="text-center mt-8">
          <NuxtLink :to="localePath('/')">
            <Button outlined severity="danger" class="tracking-wider"
              ><Icon name="solar:stop-linear" class="mr-2" />{{ t('btn.terminate') }}</Button
            ></NuxtLink
          >
        </div>
      </div>

      <!-- 发送完毕 -->
      <div v-else class="flex flex-col items-center justify-center py-10 gap-4">
        <Icon name="solar:confetti-line-duotone" size="100" class="text-amber-500" />
        <p class="text-xl tracking-wider">{{ t('hint.transCompleted') }}</p>

        <div class="py-4 flex flex-col md:flex-row items-center justify-center gap-6">
          <NuxtLink to="https://www.buymeacoffee.com/shouchen" target="_blank">
            <Button outlined severity="contrast" class="tracking-wider"
              ><IconCoffee class="size-[1.125rem] mr-2" />{{ t('btn.buyMeCoffee') }}</Button
            >
          </NuxtLink>

          <NuxtLink :to="localePath('/')">
            <Button severity="contrast" class="tracking-wider"
              ><Icon name="solar:home-2-linear" class="mr-2" />{{ t('btn.toHome') }}</Button
            ></NuxtLink
          >
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.loader {
  width: 100px;
  height: 40px;
  --g: radial-gradient(
      farthest-side,
      transparent calc(95% - 3px),
      currentColor calc(100% - 3px) 98%,
      transparent 101%
    )
    no-repeat;
  background: var(--g), var(--g), var(--g);
  background-size: 30px 30px;
  animation: l9 1s infinite alternate;
}
@keyframes l9 {
  0% {
    background-position:
      0 50%,
      50% 50%,
      100% 50%;
  }
  20% {
    background-position:
      0 0,
      50% 50%,
      100% 50%;
  }
  40% {
    background-position:
      0 100%,
      50% 0,
      100% 50%;
  }
  60% {
    background-position:
      0 50%,
      50% 100%,
      100% 0;
  }
  80% {
    background-position:
      0 50%,
      50% 50%,
      100% 100%;
  }
  100% {
    background-position:
      0 50%,
      50% 50%,
      100% 50%;
  }
}
</style>

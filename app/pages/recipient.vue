<script setup lang="ts">
const { t } = useI18n()
const localePath = useLocalePath()
const router = useRouter()
const recipientStore = useRecipientTransferStore()
const {
  isModernFileAPISupport,
  peerUserInfo,
  peerFilesInfo,
  selectedKeys,
  totalFileSize,
  totalTransmittedBytes,
  totalSpeed,
  durationTimeStr,
  remainingTimeStr,
  curFile,
  status,
  syncDirStatus
} = storeToRefs(recipientStore)
const formatSize = humanFileSize

useSeoMeta({
  title: t('recipient')
})

const selectSyncDir = recipientStore.selectSyncDir
const doReceive = recipientStore.doReceive
const downloadFile = recipientStore.downloadFile

onMounted(() => {
  const query = router.currentRoute.value.query
  const receiveCode = `${query.code || ''}`
  if (recipientStore.redirectHomeIfInvalidCode(receiveCode)) {
    return
  }
  recipientStore.initialize(receiveCode)
})

onUnmounted(() => {
  recipientStore.cleanup()
})
</script>

<template>
  <div class="pb-8">
    <!-- 错误界面 -->
    <div v-if="status.error.code !== 0" class="py-16">
      <!-- 取件码无效 -->
      <div v-if="status.error.code === 404" class="text-center">
        <Icon
          name="solar:folder-error-linear"
          size="100"
          class="text-rose-500 dark:text-rose-600"
        />
        <p class="text-xl tracking-wider py-8">{{ t('hint.invalidPickupCode') }}</p>
      </div>
      <!-- 对方拒绝传输 -->
      <div v-else-if="status.error.code === 403" class="text-center">
        <Icon
          name="solar:close-square-linear"
          size="100"
          class="text-rose-500 dark:text-rose-600"
        />
        <p class="text-xl tracking-wider py-8">{{ t('hint.refusesToTransmit') }}</p>
      </div>
      <!-- 连接超时 -->
      <div v-else-if="status.error.code === -10" class="text-center">
        <Icon
          name="material-symbols:timer-off-outline-rounded"
          size="100"
          class="text-rose-500 dark:text-rose-600"
        />
        <p class="text-xl tracking-wider py-8">{{ t('hint.connectTimeout') }}</p>
      </div>
      <!-- 其他错误 -->
      <div v-else class="text-center">
        <Icon name="solar:sad-square-line-duotone" size="100" />
        <p class="text-xl tracking-wider pt-8">{{ t('hint.serverError') }}</p>
        <p class="text-sm tracking-wider pb-8 mt-2">({{ t('hint.closeTheProxy') }})</p>
      </div>

      <div class="text-center my-4">
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
      <p class="text-xs tracking-wide">{{ t('hint.connecting') }}</p>
    </div>

    <!-- 等待对方确认 -->
    <div
      v-else-if="status.isWaitingPeerConfirm"
      class="flex flex-col gap-4 items-center justify-center py-20"
    >
      <div class="loader2"></div>
      <p class="text-sm tracking-wide mt-2">{{ t('hint.waitingForConfirm') }}</p>
    </div>

    <!-- 连接成功页面 -->
    <div v-else class="md:grid md:grid-cols-2 md:gap-8 px-4 md:px-[10vw]">
      <!-- 用户和文件展示 -->
      <div>
        <!-- 发送方用户 -->
        <div
          class="p-2 pr-3 md:p-3 md:pr-5 shadow shadow-black/20 dark:bg-neutral-900 rounded-full flex flex-row items-center"
        >
          <Avatar
            :image="peerUserInfo.avatarURL"
            shape="circle"
            size="large"
            class="shadow shadow-black/15"
          />
          <span class="ml-3 text-base flex-1">{{ peerUserInfo.nickname }}</span>
          <Icon
            v-if="status.isConnectPeer"
            name="solar:link-round-angle-bold"
            class="text-green-500"
            size="20"
          />
          <Icon
            v-else
            name="solar:link-broken-minimalistic-broken"
            class="text-red-500"
            size="20"
          />
        </div>

        <!-- 文件列表 -->
        <div class="mt-4 md:mt-6">
          <!-- 单个文件 -->
          <div v-if="peerFilesInfo.type === 'transFile'" class="flex flex-col items-center mt-8">
            <Icon name="material-symbols-light:unknown-document-outline-rounded" size="64" />
            <p class="text-lg">{{ curFile.name }}</p>
            <p class="text-xs mt-1 text-gray-600 dark:text-gray-500">
              {{ formatSize(curFile.size) }}
            </p>
          </div>
          <!-- 目录 -->
          <FilesTree
            v-else-if="peerFilesInfo.type === 'transDir'"
            :file-map="peerFilesInfo.fileMap"
            :disabled="status.isLock"
            v-model:selected-key="selectedKeys"
          />
          <!-- 同步目录 -->
          <div v-else-if="peerFilesInfo.type === 'syncDir'">
            <!-- 选择要同步的目录 -->
            <div v-if="syncDirStatus.isWaitingSelectDir">
              <div class="flex flex-col items-center my-8">
                <Icon name="solar:folder-with-files-line-duotone" size="64" />
                <p class="text-lg mt-2">{{ syncDirStatus.folderName }}</p>
                <!-- <p class="text-xs mt-1 text-gray-600 dark:text-gray-500">
                  {{ humanFileSize(curFile.size) }}
                </p> -->
              </div>
              <p class="text-xs my-2">
                <span class="text-red-500">*</span>{{ t('hint.pleaseSelectDirToReceiveSync') }}
              </p>
              <Button
                outlined
                rounded
                severity="contrast"
                class="w-full tracking-wider"
                @click="selectSyncDir"
                ><Icon name="solar:folder-with-files-line-duotone" class="mr-2" />{{
                  t('btn.selectDir')
                }}</Button
              >
            </div>
            <!-- 对比目录结构 -->
            <div v-else-if="syncDirStatus.isDiffing" class="flex flex-col items-center mt-12">
              <!-- <Icon name="material-symbols-light:unknown-document-outline-rounded" size="64" /> -->
              <div class="loader2"></div>
              <p class="mt-8">{{ t('hint.inCompStructure') }}</p>
            </div>
            <!-- 选择要新增、更新、删除的文件列表 -->
            <div v-else>
              <p>{{ t('hint.pleaseSelectAdd') }}</p>
              <FilesTree
                :file-map="syncDirStatus.fileMapAdd"
                :disabled="status.isLock"
                v-model:selected-key="syncDirStatus.addKeys"
              />
              <p class="mt-2">{{ t('hint.pleaseSelectUpdate') }}</p>
              <FilesTree
                :file-map="syncDirStatus.fileMapUpdate"
                :disabled="status.isLock"
                v-model:selected-key="syncDirStatus.updateKeys"
              />
              <p class="mt-2">{{ t('hint.pleaseSelectDelete') }}</p>
              <FilesTree
                :file-map="syncDirStatus.fileMapDelete"
                :disabled="status.isLock"
                v-model:selected-key="syncDirStatus.deleteKeys"
              />
            </div>
          </div>
        </div>
      </div>

      <!-- 进度和操作按钮 -->
      <div class="mt-6 md:mt-0">
        <!-- 进度 -->
        <div>
          <!-- 当前文件进度 -->
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

          <!-- 总进度 -->
          <p class="text-sm mt-4">{{ t('label.totalProgress') }}</p>
          <ProgressBar
            :value="
              Math.round(totalFileSize === 0 ? 0 : (totalTransmittedBytes / totalFileSize) * 100)
            "
          />
          <div class="flex flex-row items-center text-sm">
            <span>{{ durationTimeStr }} / {{ remainingTimeStr }}</span>
            <div class="flex-1"></div>
            <span>{{ formatSize(totalSpeed) }}/s</span
            ><span class="ml-4">{{ formatSize(totalTransmittedBytes) }}</span
            ><span class="mx-1">/</span><span>{{ formatSize(totalFileSize) }}</span>
          </div>
        </div>

        <!-- 操作按钮 -->
        <div v-if="status.warn.code === 0" class="my-16">
          <!-- 接收和终止 -->
          <Button
            v-if="!status.isLock"
            rounded
            severity="contrast"
            class="w-full tracking-wider"
            :disabled="
              !status.isConnectPeer ||
              status.isReceiving ||
              (peerFilesInfo.type === 'syncDir' && syncDirStatus.isDiffing)
            "
            @click="doReceive"
            ><Icon name="solar:archive-down-minimlistic-line-duotone" class="mr-2" />{{
              t('btn.receive')
            }}</Button
          >
          <!-- 终止传输 -->
          <NuxtLink :to="localePath('/')">
            <Button
              v-if="status.isReceiving"
              rounded
              outlined
              severity="danger"
              class="w-full tracking-wider"
              >{{ t('btn.terminate') }}</Button
            >
          </NuxtLink>

          <!-- 传输完成 -->
          <div
            v-if="status.isDone"
            class="flex flex-col items-center justify-center py-4 gap-4 mb-4"
          >
            <Icon name="solar:confetti-line-duotone" size="100" class="text-amber-500" />
            <p class="text-xl tracking-wider">{{ t('hint.transCompleted') }}</p>
          </div>

          <!-- 如果不支持现代文件访问，则显示手动下载按钮 -->
          <Button
            v-if="status.isDone && !isModernFileAPISupport"
            rounded
            outlined
            severity="contrast"
            class="w-full tracking-wider"
            @click="downloadFile"
            ><Icon name="solar:download-minimalistic-linear" class="mr-2" />{{
              t('btn.download')
            }}</Button
          >

          <div v-if="status.isDone" class="py-6">
            <!-- buy me coffee -->
            <NuxtLink to="https://www.buymeacoffee.com/shouchen" target="_blank">
              <Button rounded outlined severity="contrast" class="w-full tracking-wider"
                ><IconCoffee class="size-[1.125rem] mr-2" />{{ t('btn.buyMeCoffee') }}</Button
              >
            </NuxtLink>

            <!-- 回主页 -->
            <NuxtLink :to="localePath('/')">
              <Button rounded severity="contrast" class="w-full tracking-wider block mt-6"
                ><Icon name="solar:home-2-linear" class="mr-2" />{{ t('btn.toHome') }}</Button
              ></NuxtLink
            >
          </div>
        </div>

        <!-- 业务异常 -->
        <div v-else class="mb-16 flex flex-col items-center justify-center py-10 gap-4">
          <Icon
            name="material-symbols-light:warning-outline-rounded"
            size="96"
            class="text-amber-500 dark:text-amber-600"
          />
          <!-- 当前浏览器不支持目录传输 -->
          <div v-if="status.warn.code === -1">
            <p class="text-xl tracking-wider">{{ t('hint.noSupportDirTrans') }}</p>
          </div>
          <!-- 连接异常中断 -->
          <div v-else-if="status.warn.code === -2">
            <p class="text-xl tracking-wider">{{ t('hint.connectInterrupted') }}</p>
          </div>
          <!-- 文件哈希校验失败 -->
          <div v-else-if="status.warn.code === -3">
            <p class="text-xl tracking-wider">{{ t('hint.hashCheckFail') }}</p>
          </div>

          <div class="text-center py-4">
            <NuxtLink :to="localePath('/')">
              <Button severity="contrast" class="tracking-wider"
                ><Icon name="solar:home-2-linear" class="mr-2" />{{ t('btn.toHome') }}</Button
              ></NuxtLink
            >
          </div>
        </div>

        <!-- <p>{{ totalFileSize }}</p>
          <p>{{ totalTransmittedBytes }}</p>
          <p>{{ waitReceiveFileList }}</p> -->
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

.loader2 {
  width: 64px;
  aspect-ratio: 1;
  display: grid;
  border: 4px solid #0000;
  border-radius: 50%;
  /* border-right-color: #25b09b; */
  border-right-color: currentColor;
  animation: l15 1s infinite linear;
}
.loader2::before,
.loader2::after {
  content: '';
  grid-area: 1/1;
  margin: 2px;
  border: inherit;
  border-radius: 50%;
  animation: l15 2s infinite;
}
.loader2::after {
  margin: 8px;
  animation-duration: 3s;
}
@keyframes l15 {
  100% {
    transform: rotate(1turn);
  }
}
</style>

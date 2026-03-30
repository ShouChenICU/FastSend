<script setup lang="ts">
const appStore = useAppStore()
const { isFullScreenLoading } = storeToRefs(appStore)
const loaderElm = ref()

watch(isFullScreenLoading, (isLoad) => {
  if (isLoad) {
    loaderElm.value.style.display = 'flex'
    setTimeout(() => {
      loaderElm.value.style.opacity = '1'
    }, 1)
  } else {
    loaderElm.value.style.opacity = '0'
    setTimeout(() => {
      loaderElm.value.style.display = 'none'
    }, 500)
  }
})
</script>

<template>
  <div class="loader-wrapper" ref="loaderElm">
    <div class="loader"></div>
  </div>
</template>

<style scoped>
.loader-wrapper {
  display: flex;
  flex-direction: row;
  justify-content: center;
  align-items: center;
  position: fixed;
  left: 0;
  top: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(3px);
  z-index: 100;
  opacity: 1;
  transition: opacity 0.5s ease;
}

.loader {
  width: 100px;
  height: 40px;
  --g: radial-gradient(
      farthest-side,
      transparent calc(95% - 3px),
      #fff calc(100% - 3px) 98%,
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

import type { UserInfo } from '~/types/transfer'

/**
 * 用户偏好与身份信息仓库。
 * 负责管理昵称、头像以及发送端自动确认配置，并统一做本地持久化。
 */
export const useUserStore = defineStore('user', () => {
  const userInfo = reactive<UserInfo>({
    nickname: '',
    avatarURL: ''
  })
  const isConfirmDefault = ref(false)
  const hasInitialized = ref(false)

  function persistNickname() {
    if (import.meta.client) {
      localStorage.setItem('nickname', userInfo.nickname)
    }
  }

  function persistAvatar() {
    if (import.meta.client) {
      localStorage.setItem('avatarURL', userInfo.avatarURL)
    }
  }

  function setNickname(nickname: string) {
    const nextNickname = nickname.trim().substring(0, 16)
    userInfo.nickname = nextNickname || `User_${genRandomString(6)}`
    persistNickname()
  }

  function setAvatarURL(url: string) {
    userInfo.avatarURL = url
    persistAvatar()
  }

  function setConfirmDefault(value: boolean) {
    isConfirmDefault.value = value
    if (import.meta.client) {
      localStorage.setItem('isConfirmDefault', JSON.stringify(value))
    }
  }

  function initAvatar() {
    if (!import.meta.client) {
      return
    }
    const fr = new FileReader()
    fr.onload = () => {
      setAvatarURL(`${fr.result || ''}`)
    }
    fetch('/akari.webp')
      .then((res) => res.blob())
      .then((blob) => fr.readAsDataURL(blob))
      .catch(console.warn)
  }

  function resetUserInfo() {
    setNickname('')
    initAvatar()
  }

  function openAvatarPicker() {
    selectAvatar((url) => {
      if (url) {
        setAvatarURL(url)
      }
    })
  }

  function initializeFromStorage() {
    if (!import.meta.client || hasInitialized.value) {
      return
    }

    const nickname = localStorage.getItem('nickname')
    if (nickname) {
      userInfo.nickname = nickname
    } else {
      setNickname('')
    }

    const avatarURL = localStorage.getItem('avatarURL')
    if (avatarURL) {
      userInfo.avatarURL = avatarURL
    } else {
      initAvatar()
    }

    isConfirmDefault.value = getValFromLocalStorage('isConfirmDefault', false) || false
    hasInitialized.value = true
  }

  return {
    userInfo,
    isConfirmDefault,
    hasInitialized,
    setNickname,
    setAvatarURL,
    setConfirmDefault,
    initAvatar,
    resetUserInfo,
    openAvatarPicker,
    initializeFromStorage
  }
})
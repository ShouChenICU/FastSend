export default function useUserInfo() {
  return useState('userInfo', () => ({
    nickname: '',
    avatarURL: ''
  }))
}

import { ref } from 'vue'

/**
 * Composable quản lý phát âm thanh cho tin nhắn bot, hỗ trợ cache và mở rộng danh sách bot hỗ trợ voice qua env.
 * Env có thể khai báo: VITE_BOTS_VOICE=ID1,ID2,ID3
 * Ngoài ra vẫn tự động gộp các biến cũ: VITE_BOT_ENGLISH, VITE_BOT_LOOK
 */
export function useVoice() {
  const isPlaying = ref(false)
  const isLoadingVoice = ref(false)
  const enableVoicePlayback = ref(localStorage.getItem('enableVoicePlayback') !== 'false')
  let audio: HTMLAudioElement | null = null

  // Cache: messageId -> voice URL
  const voiceCache = new Map<string, string>()

  const envBots = (import.meta.env.VITE_BOTS_VOICE as string | undefined)?.split(',')
    .map(s => s.trim())
    .filter(Boolean) || []
  const legacyEnglish = import.meta.env.VITE_BOT_ENGLISH as string | undefined
  const legacyLook = import.meta.env.VITE_BOT_LOOK as string | undefined
  const voiceBotIds = Array.from(new Set([...(envBots), legacyEnglish, legacyLook].filter(Boolean))) as string[]

  function toggleVoicePlayback() {
    enableVoicePlayback.value = !enableVoicePlayback.value
    localStorage.setItem('enableVoicePlayback', String(enableVoicePlayback.value))
  }

  function isVoiceBot(botId?: string) {
    return !!botId && voiceBotIds.includes(botId)
  }

  function stopVoice() {
    if (audio) {
      audio.pause()
      audio.currentTime = 0
      audio = null
    }
    isPlaying.value = false
  }

  function playVoice(url: string) {
    stopVoice()
    audio = new Audio(url)
    audio.play().then(() => {
      isPlaying.value = true
      audio?.addEventListener('ended', () => {
        isPlaying.value = false
      })
    }).catch(() => {
      isPlaying.value = false
    })
  }

  /**
   * Lấy hoặc tạo mới voice URL cho 1 message.
   * @param messageId ID tin nhắn bot (dùng làm key cache)
   * @param plainText Nội dung plain text
   * @param fetchFn Hàm async trả về URL audio (gọi API backend)
   */
  async function getOrCreateVoice(messageId: string, plainText: string, fetchFn: (plainText: string, messageId: string) => Promise<string>): Promise<string> {
    if (voiceCache.has(messageId)) {
      return voiceCache.get(messageId)!;
    }
    isLoadingVoice.value = true
    try {
      const url = await fetchFn(plainText, messageId)
      voiceCache.set(messageId, url)
      return url
    } finally {
      isLoadingVoice.value = false
    }
  }

  return {
    isPlaying,
    isLoadingVoice,
    enableVoicePlayback,
    toggleVoicePlayback,
    isVoiceBot,
    getOrCreateVoice,
    playVoice,
    stopVoice
  }
}

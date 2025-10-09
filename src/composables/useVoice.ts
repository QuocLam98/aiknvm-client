import { ref } from 'vue'
import { Howl, Howler } from 'howler'

/**
 * Composable quản lý phát âm thanh cho tin nhắn bot, hỗ trợ cache và mở rộng danh sách bot hỗ trợ voice qua env.
 * Env có thể khai báo: VITE_BOTS_VOICE=ID1,ID2,ID3
 * Ngoài ra vẫn tự động gộp các biến cũ: VITE_BOT_ENGLISH, VITE_BOT_LOOK
 */
export function useVoice() {
  const isPlaying = ref(false)
  const isLoadingVoice = ref(false)
  const enableVoicePlayback = ref(localStorage.getItem('enableVoicePlayback') !== 'false')
  let howl: Howl | null = null
  let currentObjectUrl: string | null = null

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
    if (howl) {
      try { howl.stop() } catch {}
      try { howl.unload() } catch {}
      howl = null
    }
    if (currentObjectUrl) {
      try { URL.revokeObjectURL(currentObjectUrl) } catch {}
      currentObjectUrl = null
    }
    isPlaying.value = false
  }

  // Gọi ngay khi user click trước khi đợi API tạo voice (giảm rủi ro autoplay block)
  async function primePlayback(): Promise<void> {
    try {
      // Resume WebAudio context nếu bị suspended (Howler sẽ tự unlock trên user gesture)
      // Dù ta dùng html5:true, thao tác này vô hại và có thể giúp vài trình duyệt.
      // @ts-ignore - ctx có thể undefined tùy nền tảng
      if (Howler && (Howler as any).ctx && (Howler as any).ctx.state === 'suspended') {
        await (Howler as any).ctx.resume()
      }
    } catch (e) {
      console.warn('primePlayback resume ctx failed', e)
    }
  }

  async function playVoice(url: string): Promise<boolean> {
    try {
      stopVoice()
      try { Howler.mute(false) } catch {}
      // Attempt direct network streaming with Howler (uses HTML5 Audio with html5: true)
      howl = new Howl({
        src: [url],
        html5: true,
        format: ['wav', 'mp3', 'ogg'],
        preload: true,
        onplay: () => { isPlaying.value = true },
        onend: () => { isPlaying.value = false },
        onstop: () => { isPlaying.value = false },
        onpause: () => { isPlaying.value = false },
        onloaderror: (_id, err) => { console.error('Howler load error', err) },
        onplayerror: (_id, err) => { console.warn('Howler play error, will try blob fallback', err) }
      })

      try {
        await new Promise<void>((resolve, reject) => {
          // howler's play returns a sound id; errors may come via onplayerror
          try {
            const soundId = howl!.play()
            // If autoplay is blocked, onplayerror will fire; add small timeouts as guards
            const check50 = setTimeout(() => {
              if (howl && howl.playing(soundId)) resolve()
            }, 50)
            // Hard timeout to bail to fallback if not playing within 1200ms
            const timeout = setTimeout(() => {
              if (!howl) return
              if (!howl.playing(soundId)) {
                clearTimeout(check50)
                reject(new Error('Direct play stalled'))
              }
            }, 1200)
            // Also listen for play event to resolve
            howl!.once('play', () => { clearTimeout(check50); clearTimeout(timeout); resolve() })
            howl!.once('playerror', (_id, err) => { clearTimeout(check50); clearTimeout(timeout); reject(err) })
          } catch (e) {
            reject(e)
          }
        })
        return true
      } catch (directErr) {
        // Blob fallback for strict CORS or streaming issues
        try {
          const resp = await fetch(url, {
            method: 'GET',
            mode: 'cors',
            headers: { 'Accept': 'audio/wav, audio/*;q=0.9, */*;q=0.8' }
          })
          if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
          const ct = resp.headers.get('content-type') || ''
          if (!ct.includes('audio')) {
            console.error('Blob fallback: content-type is not audio, got', ct)
            // Still try to play, but report likely server issue
          }
          const blob = await resp.blob()
          currentObjectUrl = URL.createObjectURL(blob)
          // Play blob via howler
          howl?.unload()
          howl = new Howl({
            src: [currentObjectUrl],
            html5: true,
            format: ['wav'],
            preload: true,
            onplay: () => { isPlaying.value = true },
            onend: () => { isPlaying.value = false },
            onstop: () => { isPlaying.value = false },
            onpause: () => { isPlaying.value = false }
          })
          await new Promise<void>((resolve, reject) => {
            try {
              const sid = howl!.play()
              setTimeout(() => {
                if (howl && howl.playing(sid)) resolve()
              }, 50)
              howl!.once('play', () => resolve())
              howl!.once('playerror', (_id, err) => reject(err))
            } catch (e) { reject(e) }
          })
          return true
        } catch (blobErr) {
          console.error('Howler blob fallback failed', blobErr)
          isPlaying.value = false
          return false
        }
      }
    } catch (err) {
      console.error('Failed to play audio:', err)
      isPlaying.value = false
      return false
    }
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
    primePlayback,
    getOrCreateVoice,
    playVoice,
    stopVoice
  }
}

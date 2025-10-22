<script setup lang="ts">
import { ref, onMounted, nextTick, watch } from 'vue'
import axios from 'axios'
import { useToast } from 'vue-toast-notification'
import { useRoute, useRouter } from 'vue-router'

interface ChatMessage {
  sender: 'user' | 'bot'
  content: string
  createdAt: string
  imageUrl?: string
  fileUser?: string
}

interface Bot {
  _id: string
  name: string
  description: string
  template: string
  image?: string
}

const TOAST_DEFAULT_DURATION = 3000
const TOAST_LONG_DURATION = 8000
const MAX_ATTACHMENT_SIZE = 20 * 1024 * 1024
const IMAGE_MIME_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif']
const DOCUMENT_MIME_TYPES = [
  'application/pdf',
  'text/plain',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
]
const SUPPORTED_ATTACHMENT_TYPES = new Set([...IMAGE_MIME_TYPES, ...DOCUMENT_MIME_TYPES])

const toast = useToast()
const showToastError = (message: string, duration = TOAST_DEFAULT_DURATION) => {
  toast.error(message, {
    position: 'top',
    duration
  })
}

const route = useRoute()
const router = useRouter()

const isLoaded = ref(false)
const isTyping = ref(false)
const code = ref('')
const historyId = ref('')
const textareaRef = ref<HTMLTextAreaElement | null>(null)
const messages = ref<ChatMessage[]>([])
const chatContainer = ref<HTMLElement | null>(null)
const previewFile = ref<File | null>(null)
const previewUrl = ref<string | null>(null)
const newMessage = ref('')
const urlServer = import.meta.env.VITE_URL_SERVER
const botImage = ref('')
const getBotData = ref<Bot>()
const limit = 20
const loading = ref(false)
const hasMore = ref(true)

const onImageLoad = () => {
  isLoaded.value = true
}

const renderMarkdown = async (markdown: string) => {
  const { unified } = await import('unified')
  const remarkParse = (await import('remark-parse')).default
  const rehypeStringify = (await import('rehype-stringify')).default
  const remarkRehype = (await import('remark-rehype')).default
  const rehypeHighlight = (await import('rehype-highlight')).default
  const { hlLanguages } = await import('@/utils/hl-languages')

  const file = await unified()
    .use(remarkParse)
    .use(remarkRehype)
    .use(rehypeHighlight, { languages: hlLanguages as any })
    .use(rehypeStringify)
    .process(markdown)

  return String(file)
}

const clearPreview = () => {
  if (previewUrl.value && previewUrl.value.startsWith('blob:')) {
    (window.URL as any).revokeObjectURL(previewUrl.value)
  }
  previewUrl.value = null
  previewFile.value = null
}

const getBot = async (id: string) => {
  if (!id) return
  try {
    const res = await axios.get(`${urlServer}/get-bot/${id}`)
    getBotData.value = res.data
  } catch {
    showToastError('Lỗi khi lấy thông tin bot!')
  }
}

const autoResize = () => {
  if (!textareaRef.value) return

  textareaRef.value.style.height = 'auto'

  if (!textareaRef.value.value) {
    textareaRef.value.style.height = '1.5rem'
    textareaRef.value.style.overflowY = 'hidden'
    return
  }

  const scrollHeight = textareaRef.value.scrollHeight
  const maxHeight = parseFloat(getComputedStyle(textareaRef.value).lineHeight) * 10

  textareaRef.value.style.overflowY = scrollHeight > maxHeight ? 'auto' : 'hidden'
  textareaRef.value.style.height = Math.min(scrollHeight, maxHeight) + 'px'
}

const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
  chatContainer.value?.scrollTo({
    top: chatContainer.value.scrollHeight,
    behavior
  })
}

const scrollToBottomInstant = () => {
  if (chatContainer.value) {
    chatContainer.value.scrollTop = chatContainer.value.scrollHeight
  }
}

const isValidUrl = (str: string) => /^(https?:\/\/[^\s]+)$/.test(str)

const openImage = (url: string) => {
  window.open(url, '_blank')
}

const validateAttachment = (file: File) => {
  if (file.size > MAX_ATTACHMENT_SIZE) {
    showToastError('Dung lượng file không được quá 20MB.', TOAST_LONG_DURATION)
    return false
  }

  if (!SUPPORTED_ATTACHMENT_TYPES.has(file.type)) {
    showToastError('Định dạng file không được hỗ trợ.', TOAST_LONG_DURATION)
    return false
  }

  return true
}

const downloadImage = async (imageUrl: string) => {
  try {
    const response = await axios.post(`${urlServer}/download-file`, { url: imageUrl }, {
      responseType: 'blob'
    })

    const blob = new Blob([response.data])
    const blobUrl = window.URL.createObjectURL(blob)

    const link = document.createElement('a')
    link.href = blobUrl
    link.download = imageUrl.split('/').pop() || 'download.jpg'
    link.click()
    window.URL.revokeObjectURL(blobUrl)
  } catch (err) {
    showToastError('Tải ảnh thất bại!')
  }
}

const fetchMessages = async (isLoadMore = false) => {
  loading.value = true

  try {
    const res = await axios.get(`${urlServer}/list-message-history/${historyId.value}`)
    const rawMessages = Array.isArray(res.data) ? res.data : []
    if (!rawMessages.length) {
      messages.value = []
      hasMore.value = false
      return
    }

    botImage.value = rawMessages[0].bot
    await getBot(botImage.value)

    const orderedMessages = rawMessages.reverse()
    const newMessages: ChatMessage[] = []

    for (const msg of orderedMessages) {
      if (msg.contentUser) {
        newMessages.push({
          sender: 'user',
          content: msg.contentUser,
          createdAt: msg.createdAt,
          fileUser: msg.fileUser
        })
      }

      if (msg.contentBot) {
        const renderedContent = await renderMarkdown(msg.contentBot)
        newMessages.push({
          sender: 'bot',
          content: renderedContent,
          createdAt: msg.createdAt,
          imageUrl: isValidUrl(msg.contentBot) ? msg.contentBot : undefined
        })
      }
    }

    messages.value = isLoadMore
      ? [...newMessages, ...messages.value]
      : newMessages

    if (newMessages.length < limit) {
      hasMore.value = false
    }

    await nextTick()
    scrollToBottomInstant()
  } catch (error) {
    showToastError('Không thể tải lịch sử trò chuyện!')
  } finally {
    loading.value = false
  }
}

const sendMessage = async () => {
  const content = newMessage.value.trim()
  const token = localStorage.getItem('token') ?? ''

  if (!content) {
    showToastError('Yêu cầu nhập nội dung tin nhắn!')
    return
  }

  const formData = new FormData()
  formData.append('bot', botImage.value)
  formData.append('token', token)
  formData.append('content', content)
  formData.append('historyChat', historyId.value || '')

  isTyping.value = true
  messages.value.push({
    sender: 'user',
    content,
    fileUser: previewUrl.value ?? '',
    createdAt: new Date().toISOString()
  })

  await nextTick()
  scrollToBottom()

  newMessage.value = ''
  clearPreview()
  autoResize()

  messages.value.push({
    sender: 'bot',
    content: 'Đang trả lời...',
    createdAt: new Date().toISOString()
  })

  try {
    const response = await axios.post(`${urlServer}/create-message-image`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })

    if (response.data.status === 400) {
      router.push('/login')
      localStorage.clear()
      return
    }

    messages.value.pop()
    const { contentBot, createdAt } = response.data

    messages.value.push({
      sender: 'bot',
      content: contentBot,
      imageUrl: isValidUrl(contentBot) ? contentBot : undefined,
      createdAt
    })

    await nextTick()
    scrollToBottom()

    nextTick(() => {
      textareaRef.value?.focus()
    })
  } catch (error) {
    showToastError('Lỗi khi gửi tin nhắn!')

    const typingIndex = messages.value.findIndex(
      (msg) => msg.sender === 'bot' && msg.content === 'Đang trả lời...'
    )
    if (typingIndex !== -1) {
      messages.value.splice(typingIndex, 1)
    }

    messages.value.push({
      sender: 'bot',
      content: 'Bạn hãy gõ lại câu hỏi rõ ràng hơn.',
      createdAt: new Date().toISOString()
    })
  } finally {
    isTyping.value = false
  }
}

const handlePaste = (event: ClipboardEvent) => {
  const items = event.clipboardData?.items
  if (!items) return

  for (const item of items) {
    if (item.kind !== 'file') continue

    const file = item.getAsFile()
    if (!file) continue
    if (!validateAttachment(file)) continue

    clearPreview()
    previewFile.value = file
    previewUrl.value = (window.URL as any).createObjectURL(file)
    break
  }
}

const handleKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault()
    if (isTyping.value) {
      showToastError('Trợ lý đang trả lời câu hỏi của bạn, vui lòng chờ chút')
      return
    }
    sendMessage()
  }
}

watch(() => route.query.code, async (newCode) => {
  if (typeof newCode !== 'string') return

  await nextTick()
  historyId.value = newCode || ''
  messages.value = []
  clearPreview()
  await fetchMessages()
  autoResize()
}, { immediate: true })

onMounted(async () => {
  const queryCode = route.query.code
  if (typeof queryCode === 'string' && queryCode.trim()) {
    code.value = queryCode
    historyId.value = code.value
    chatContainer.value = null
    await fetchMessages()
  } else {
    router.push('/dashboard')
  }
  autoResize()
})

watch(newMessage, () => {
  autoResize()
})
</script>
<template>
  <div class="min-h-[calc(100vh-5rem)] relative">
    <div class="bg-zinc-50" style="height: calc(10px - 7.6rem + 105vh);">
      <div
        class="flex justify-between w-full bg-white px-2 chat-title shadow-md border-l border-b border-base-300 z-10">
        <div class="mt-2 grid grid-flow-col-dense place-content-center gap-2">
          <span class="font-bold text-black">
            {{ getBotData?.name || '' }}
          </span>
        </div>
      </div>

      <div v-if="getBotData" ref="chatContainer"
        class="chat-scroll border-l border-base-300 w-full shadow-inner py-2 overflow-y-auto"
        style="height: calc(10px - 7.6rem + 91vh);">

        <div v-if="messages.length === 0" class="flex items-center flex-col w-full h-full justify-center">
          <img :src="getBotData?.image" class="w-32 h-32 rounded-full text-black" alt="Bot Avatar" />
          <h1 class="font-bold text-black">{{ getBotData?.name }}</h1>
          <span style="width: 600px; text-align: center;" class="text-black">{{ getBotData?.description }}</span>
        </div>

        <div v-for="(message, index) in messages" :key="index"
          :class="message.sender === 'user' ? 'chat chat-end' : 'chat chat-start'">

          <div v-if="message.sender === 'bot'" class="chat-image avatar">
            <div v-if="getBotData?.image" class="avatar">
              <div class="w-8 rounded-full">
                <img :src="getBotData?.image" alt="Bot Avatar" />
              </div>
            </div>
          </div>

          <div v-else-if="message.fileUser" class="pb-4">
            <img :src="message.fileUser"
              class="w-96 rounded-lg cursor-pointer transition hover:scale-105"
              alt="User Uploaded Image"
              @click="openImage(message.fileUser)" />
          </div>

          <div v-if="!message.imageUrl" class="chat-bubble">
            <span v-if="message.content === 'Đang trả lời...'" class="typing-indicator">
              <span></span><span></span><span></span>
            </span>
            <span v-else-if="message.sender === 'bot'" v-html="message.content" class="markdown-body"></span>
            <span v-else>{{ message.content }}</span>
          </div>
          <div v-else class="p-2 flex flex-col items-start gap-2">
            <div class="relative inline-block">
              <img
                :src="message.imageUrl"
                alt="Bot image"
                class="w-64 h-64 object-cover rounded-md cursor-pointer transition hover:scale-105 duration-700 ease-in-out"
                :class="isLoaded ? 'opacity-100 blur-0' : 'opacity-0 blur-md'"
                @click="openImage(message.imageUrl)"
                @load="onImageLoad"
              />
              <button @click.prevent="downloadImage(message.imageUrl!)"
                class="absolute top-2 right-2 bg-white rounded-full p-1 shadow hover:bg-gray-200 transition cursor-pointer"
                title="Tải ảnh xuống">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
                  <path fill="currentColor"
                    d="M22.71 6.29a1 1 0 0 0-1.42 0L20 7.59V2a1 1 0 0 0-2 0v5.59l-1.29-1.3a1 1 0 0 0-1.42 1.42l3 3a1 1 0 0 0 .33.21a.94.94 0 0 0 .76 0a1 1 0 0 0 .33-.21l3-3a1 1 0 0 0 0-1.42M19 13a1 1 0 0 0-1 1v.38l-1.48-1.48a2.79 2.79 0 0 0-3.93 0l-.7.7l-2.48-2.48a2.85 2.85 0 0 0-3.93 0L4 12.6V7a1 1 0 0 1 1-1h8a1 1 0 0 0 0-2H5a3 3 0 0 0-3 3v12a3 3 0 0 0 3 3h12a3 3 0 0 0 3-3v-5a1 1 0 0 0-1-1M5 20a1 1 0 0 1-1-1v-3.57l2.9-2.9a.79.79 0 0 1 1.09 0l3.17 3.17l4.3 4.3Zm13-1a.9.9 0 0 1-.18.53L13.31 15l.7-.7a.77.77 0 0 1 1.1 0L18 17.21Z" />
                </svg>
              </button>
            </div>
          </div>

        </div>


      </div>

      <div v-else class="flex items-center justify-center h-full text-gray-400">
        <p>Chọn một bot để bắt đầu trò chuyện</p>
      </div>
    </div>

    <div class="layout-input ">
      <div class="bg-white shadow-xl flex flex-col py-2 px-3 border-l border-t rounded-lg border-base-300 w-full">
        <div class="flex flex-col w-full">
          <Transition name="fade">
            <div v-if="previewUrl" class="relative mr-2 w-full mb-2">
              <button @click="clearPreview"
                class="absolute top-0 right-0 bg-black bg-opacity-50 text-white rounded-full w-5 h-5 flex items-center justify-center z-10 hover:bg-opacity-75">
                ×
              </button>

              <div v-if="previewFile?.type.startsWith('image/')"
                class="max-w-[150px] max-h-[150px] border rounded overflow-hidden">
                <img :src="previewUrl" class="object-cover w-full h-auto max-h-[150px]" />
              </div>
            </div>
          </Transition>

          <div class="flex w-full items-center">
            <textarea v-model="newMessage" @input="autoResize" @keydown="handleKeydown" @paste="handlePaste"
              placeholder="Xin mời nhập câu hỏi..."
              class="input-chat w-full border-none focus-within:ring-0 px-0 focus-visible:outline-none resize-none overflow-hidden"
              maxlength="1000" rows="1" ref="textareaRef"
              style="line-height: 1.5rem; max-height: calc(1.5rem * 10); overflow-y: auto;"></textarea>

            <svg v-if="isTyping" class="w-10 h-10 ml-2 text-gray-400 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
            </svg>

            <svg v-else @click="sendMessage" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" role="img"
              class="icon w-10 h-10 ml-2 text-primary cursor-pointer transition-all active:scale-75" width="1em"
              height="1em" viewBox="0 0 48 48">
              <path fill="currentColor"
                d="M41.42 7.309s3.885-1.515 3.56 2.164c-.107 1.515-1.078 6.818-1.834 12.553l-2.59 16.99s-.216 2.489-2.159 2.922c-1.942.432-4.856-1.515-5.396-1.948c-.432-.325-8.094-5.195-10.792-7.575c-.756-.65-1.62-1.948.108-3.463L33.649 18.13c1.295-1.3 2.59-4.33-2.806-.65l-15.11 10.28s-1.727 1.083-4.964.109l-7.016-2.165s-2.59-1.623 1.835-3.246c10.793-5.086 24.068-10.28 35.831-15.15" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>



<style>
.drawer-side h2,
svg {
  color: black;
}

.chat-container {
  max-height: 80vh;
}

.chat-scroll {
  -ms-overflow-style: none;
  /* IE and Edge */
  scrollbar-width: none;
  /* Firefox */
  scrollbar-width: none;
  overflow: auto;
  overflow-y: scroll;
  padding: 0px 8px;
}

.chat-scroll::-webkit-scrollbar {
  display: none;
}

.chat-bubble {
  max-width: 50% !important;
  background-color: #e9e9e9 !important;
  color: black;
}

.chat-start .chat-bubble {
  max-width: 100% !important;
  background-color: #e9e9e9 !important;
  color: black;
}

.input-chat {
  color: black;
}

.dot-typing::after {
  content: ' .';
  animation: dots 1.5s steps(3, end) infinite;
}

@keyframes dots {
  0% {
    content: ' .';
  }

  33% {
    content: ' ..';
  }

  66% {
    content: ' ...';
  }

  100% {
    content: ' .';
  }
}

.chat-title {
  padding-top: 7px;
  padding-bottom: 7px;
  height: 49px;
}

.markdown-body {
  background-color: unset !important;
  color: black !important;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.fade-enter-to,
.fade-leave-from {
  opacity: 1;
}

.layout-input {
  position: absolute;
  bottom: 16px;
  width: 100%;
  padding: 0px 100px;
}

@media (min-width: 320px) and (max-width: 600px) {
  .layout-input {
    padding: 0px 10px;
  }
}
</style>
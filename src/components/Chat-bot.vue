<script setup lang="ts">
import { ref, onMounted, nextTick, watch } from 'vue'
import axios from 'axios'
import { useToast } from 'vue-toast-notification';
import { useRoute, useRouter } from 'vue-router'
import { useHistoryChat } from '@/composables/useHistoryChat'

interface ChatMessage {
  sender: 'user' | 'bot'
  content: string
  createdAt: string
  fileUser?: string,
  status?: number
  _loading?: boolean // dùng nội bộ để hiển thị đang xử lý,
  _id: string,
  isCopied?: boolean,
  displayContent?: string,
  isDone: boolean,
  fileType?: string,
  voice?: string
}

interface Bot {
  _id: string,
  name: string,
  description: string,
  template: string,
  image?: string
}

const isUploading = ref(false)
const isPlaying = ref(false)
const isLoadingVoice = ref(false)
let audio: HTMLAudioElement | null = null
const isTyping = ref(false)
const { loadHistoryChat } = useHistoryChat()
const historyChat = ref('')
const route = useRoute()
const router = useRouter()
const code = ref<string>('')
const textareaRef = ref<HTMLTextAreaElement | null>(null)
const toast = useToast()
const messages = ref<ChatMessage[]>([])
const chatContainer = ref<HTMLElement | null>(null)
const previewFile = ref('')
const previewFileType = ref('')
const previewUrl = ref<string | null>(null)
const getBotData = ref<Bot>()
const newMessage = ref('')
const isBotTyping = ref(false);  // Trạng thái đang trả lời
const urlServer = import.meta.env.VITE_URL_SERVER
const botImage = import.meta.env.VITE_CREATE_IMAGE
const botIdSelect = ref('')

const renderMarkdown = async (markdown: string) => {
  const { unified } = await import('unified')
  const remarkParse = (await import('remark-parse')).default
  const remarkRehype = (await import('remark-rehype')).default
  const rehypeRaw = (await import('rehype-raw')).default
  const rehypeSanitize = (await import('rehype-sanitize')).default
  const rehypeHighlight = (await import('rehype-highlight')).default
  const rehypeStringify = (await import('rehype-stringify')).default

  const file = await unified()
    .use(remarkParse)
    .use(remarkRehype, { allowDangerousHtml: true }) // cho phép HTML trong markdown
    .use(rehypeRaw) // xử lý HTML thô (VD: <br>, <b>)
    .use(rehypeSanitize) // lọc XSS (an toàn)
    .use(rehypeHighlight) // tô màu code
    .use(rehypeStringify)
    .process(markdown)

  return String(file)
}

const clearPreview = () => {
  previewUrl.value = ''
  previewFile.value = ''
}

const autoResize = () => {
  if (textareaRef.value) {
    textareaRef.value.style.height = 'auto'

    // Nếu nội dung rỗng thì reset về chiều cao mặc định
    if (!textareaRef.value.value) {
      textareaRef.value.style.height = '1.5rem' // 1 dòng = line-height
      textareaRef.value.style.overflowY = 'hidden'
      return
    }

    const scrollHeight = textareaRef.value.scrollHeight
    const maxHeight = parseFloat(getComputedStyle(textareaRef.value).lineHeight) * 10

    textareaRef.value.style.overflowY = scrollHeight > maxHeight ? 'auto' : 'hidden'
    textareaRef.value.style.height = Math.min(scrollHeight, maxHeight) + 'px'
  }
}

const openImage = (url: string) => {
  window.open(url, '_blank');
}

const typeWriterEffect = async (message: ChatMessage, plainText: string) => {
  let index = 0
  message.displayContent = ''
  message.isDone = false
  isTyping.value = true

  const typeWriter = async () => {
    if (index < plainText.length) {
      message.displayContent += plainText[index++]
      messages.value = [...messages.value]

      if (plainText[index - 1] === '\n' || index % 5 === 0) {
        await nextTick()
        scrollToBottomInstant()
      }

      setTimeout(typeWriter, 15)
    } else {
      await nextTick()
      scrollToBottomInstant()

      await new Promise(resolve => setTimeout(resolve, 300)) // delay nhẹ

      const rendered = await renderMarkdown(plainText)
      message.displayContent = rendered
      message.isDone = true
      messages.value = [...messages.value]

      await nextTick()
      scrollToBottomInstant()
      isTyping.value = false
    }
  }

  typeWriter()
}

const sendMessage = async () => {
  const formData = new FormData()
  const content = newMessage.value.trim()
  const token = localStorage.getItem('token')
  if (historyChat.value) {
    formData.append('historyChat', historyChat.value)
  }
  if (!content && !previewFile.value) {
    toast.error('Yêu cầu nhập nội dung tin nhắn!', {
      position: 'top',
      duration: 3000
    })
    return
  }
  else if (previewFile.value && !content) {
    toast.error('Yêu cầu nhập nội dung tin nhắn!', {
      position: 'top',
      duration: 3000
    })
    return
  }
  formData.append('token', token || '')
  if (content) formData.append('content', content)
  if (previewFile.value) {
    formData.append('file', previewFile.value)
    formData.append('fileType', previewFileType.value)
  }
  formData.append('bot', getBotData.value?._id || '')
  // User message
  isTyping.value = true // 👈 Bắt đầu gõ

  const renderedContentUser = await renderMarkdown(content)

  messages.value.push({
    sender: 'user',
    content: renderedContentUser,
    displayContent: renderedContentUser,
    fileUser: previewUrl.value ? previewUrl.value : '',
    createdAt: new Date().toISOString(),
    status: 0,
    _id: '',
    isDone: true,
    fileType: previewFileType.value
  })

  await nextTick()
  scrollToBottomInstant()

  newMessage.value = ''
  previewFile.value = ''
  previewUrl.value = null
  isBotTyping.value = true

  messages.value.push({
    sender: 'bot',
    content: 'Đang trả lời...',
    createdAt: new Date().toISOString(),
    status: 0,
    _id: '',
    isDone: false
  })

  nextTick(() => {
    autoResize()
  })

  try {
    const response = await axios.post(`${urlServer}/create-message`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })

    if (response.data.status === 400) {
      router.push('/login')
      localStorage.clear()
      return
    }

    previewFile.value = ''
    previewUrl.value = null
    messages.value.pop()
    const { contentBot, createdAt, status, _id, history } = response.data
    const renderedContent = await renderMarkdown(contentBot)

    const message = ({
      sender: 'bot' as 'bot', // 👈 ép kiểu "bot" cố định
      content: renderedContent,
      status: status,
      _id: _id,
      createdAt,
      isCopied: false,
      displayContent: '',
      isDone: true,
      history: history
    })

    if (historyChat.value == null || historyChat.value === '') {

      historyChat.value = history

      await axios.put(`${urlServer}/update-message-history`, {
        id: message._id,
        history: historyChat.value
      })

      loadHistoryChat()
    }

    messages.value.push(message)

    nextTick(() => {
      typeWriterEffect(message, contentBot);
    })

    nextTick(() => {
      textareaRef.value?.focus()
    })
  } catch (error) {
    toast.error('Lỗi khi gửi tin nhắn!', {
      position: 'top',
      duration: 3000
    })

    const typingIndex = messages.value.findIndex(
      (msg) => msg.sender === 'bot' && msg.content === 'Đang trả lời...'
    )
    if (typingIndex !== -1) {
      messages.value.splice(typingIndex, 1)
    }

    const fallbackMessage = 'Bạn hãy gõ lại câu hỏi rõ ràng hơn.' // 👈 Nội dung cố định

    const errorBotMessage = {
      sender: 'bot' as 'bot',
      content: fallbackMessage,
      displayContent: '',
      createdAt: new Date().toISOString(),
      status: 0,
      _id: '',
      isDone: false
    }

    messages.value.push(errorBotMessage)

    await nextTick()
    typeWriterEffect(errorBotMessage, fallbackMessage)

    isTyping.value = false
  } finally {
    isBotTyping.value = false
  }
}

const handleFileUpload = async (e: Event) => {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return

  const imageTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif']
  const documentTypes = [
    'application/pdf',
    'text/plain',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]

  if (file.size > 20 * 1024 * 1024) {
    toast.error('Dung lượng file không được quá 20MB.', {
      position: 'top',
      duration: 8000
    })
    return
  }

  if (documentTypes.includes(file.type) || imageTypes.includes(file.type)) {

       const formData = new FormData()
    formData.append('file', file || '')

    try {
      isUploading.value = true
      isTyping.value = true

      const response = await axios.post(`${urlServer}/upload-file-chat`, formData)
      previewUrl.value = response.data
      previewFile.value = response.data
      previewFileType.value = file.type

      // ✅ Delay 5s chỉ khi thành công
      await new Promise(resolve => setTimeout(resolve, 5000))
    } catch (error) {
      toast.error('Tải file lên thất bại.', {
        position: 'top',
        duration: 8000
      })
    } finally {
      isUploading.value = false
      isTyping.value = false
    }
  } else {
    toast.error('Định dạng file không được hỗ trợ.', {
      position: 'top',
      duration: 8000
    })
  }

  (e.target as HTMLInputElement).value = ''
}

const handlePaste = async (event: ClipboardEvent) => {
  const items = event.clipboardData?.items;
  if (!items) return;

  for (const item of items) {
    if (item.kind === 'file') {
      const file = item.getAsFile();
      if (file) {
        const formData = new FormData()
        formData.append('file', file || '')
        // Nếu có file, cập nhật previewFile
        try {
          isUploading.value = true
          const response = await axios.post(`${urlServer}/upload-file-chat`, formData)
          previewUrl.value = response.data
          previewFile.value = response.data
          previewFileType.value = file.type
        } catch (error) {
          toast.error('Tải file lên thất bại.', {
            position: 'top',
            duration: 8000
          })
        } finally {
          isUploading.value = false
        }
      }
    }
  }
}

const handleKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault()
    if (isTyping.value === true) {
      toast.error('Trợ lý đang trả lời câu hỏi của bạn, vui lòng chờ chút', {
        position: 'top',
        duration: 3000
      })
      return
    }
    sendMessage()
  }
  // Shift + Enter thì không làm gì để textarea tự xuống dòng
}

const handleDoubleClick = (event: MouseEvent) => {
  const textarea = event.target as HTMLTextAreaElement
  textarea.select()
}

const getBot = async (id: any) => {
  try {
    const res = await axios.get(`${urlServer}/get-bot/` + id);
    getBotData.value = res.data  // <-- đây
  }
  catch {
    toast.error('Lỗi khi lấy thông tin bot!', {
      position: 'top',
      duration: 3000
    })
  }
}

watch(() => route.query.code, async (newCode) => {
  if (typeof newCode === 'string') {
    code.value = newCode
    await nextTick();

    // Cập nhật botIdSelect và reset các giá trị khác
    botIdSelect.value = code.value || ''
    messages.value = []
    historyChat.value = ''

    // Reset preview file và URL
    previewFile.value = ''
    previewUrl.value = ''// Đặt previewUrl về chuỗi rỗng để ẩn nó


    // Gọi lại autoResize để điều chỉnh lại kích thước của textarea
    autoResize()
    await getBot(botIdSelect.value)
  }
}, { immediate: true }) // chạy luôn khi component mount

onMounted(async () => {
  const queryCode = route.query.code
  if (typeof queryCode === 'string' && queryCode.trim() !== '') {
    code.value = queryCode
    chatContainer.value = null
    await getBot(code.value)
  } else {
    // Ví dụ: chuyển hướng nếu thiếu code
    router.push('/dashboard')
    // Hoặc throw lỗi, hoặc hiện dialog báo lỗi...
  }
  autoResize()
})

const scrollToBottomInstant = () => {
  if (chatContainer.value) {
    chatContainer.value.scrollTop = chatContainer.value.scrollHeight
  }
}

const copyMessage = (message: ChatMessage) => {
  const textToCopy = document.createElement('div');
  textToCopy.innerHTML = message.content;
  // Thay thế một số thẻ HTML bằng dấu xuống dòng
  textToCopy.querySelectorAll('br').forEach(br => br.replaceWith('\n'));
  textToCopy.querySelectorAll('p').forEach(p => p.replaceWith(`${p.textContent}\n`));
  textToCopy.querySelectorAll('li').forEach(li => li.replaceWith(`- ${li.textContent}\n`));

  const pureText = textToCopy.textContent || textToCopy.innerText || '';

  navigator.clipboard.writeText(pureText)
    .then(() => {
      messages.value = messages.value.map(msg => ({
        ...msg,
        isCopied: msg === message
      }));
      setTimeout(() => {
        messages.value = messages.value.map(msg => ({
          ...msg,
          isCopied: false
        }));
      }, 2000);
    })
    .catch(() => {
      toast.error('Không thể sao chép tin nhắn!', {
        position: 'top',
        duration: 3000
      });
    });
}

const handleLikeDislike = async (message: ChatMessage, status: number) => {
  if (message.status !== 0 || message._loading) return

  message._loading = true
  try {
    // Gọi API cập nhật trạng thái like/dislike
    await updateBotMessageStatus(message._id, status)

    // Gán lại status cho tin nhắn để giao diện tự cập nhật
    message.status = status
  } catch (err) {
    console.error('Lỗi khi cập nhật like/dislike:', err)
  } finally {
    message._loading = false
  }
}

const updateBotMessageStatus = async (id: string, status: number) => {
  await axios.put(`${urlServer}/update-message`, {
    id: id,
    status: status
  });
}

const getFileType = (file: string | null): string => {
  if (!file) return ''

  if (file.startsWith('image/')) return 'image'
  if (file === 'application/pdf') return 'pdf'
  if (file === 'application/msword' || file === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') return 'doc'
  if (file === 'text/plain') return 'txt'
  return ''
}

const stripHtml = (html: string): string => {
  return html.replace(/<[^>]*>/g, '');
}

const handlePlay = async (message: ChatMessage) => {
  if (!message.voice) {
    isLoadingVoice.value = true
    const text = stripHtml(message.content)
    console.log(text)
    try {
      const voiceUrl = await axios.post(`${urlServer}/create-voice`, {
        content: text,
        id: message._id
      })// Giả định hàm này trả về string
      if (voiceUrl.data.status === 404) {
        toast.error(voiceUrl.data.message, {
          position: 'top',
          duration: 8000
        })
      }
      else {
        const target = messages.value.find(e => e._id === message._id)
        if (target) {
          target.voice = voiceUrl.data.url
        }
        playVoice(voiceUrl.data.url)
      }

    } catch (err) {
      toast.error('Lỗi khi tạo âm thanh', {
        position: 'top',
        duration: 8000
      })
    } finally {
      isLoadingVoice.value = false
    }
  }

  else {
    playVoice(message.voice)
  }
}

// Phát âm thanh
const playVoice = (url: string) => {
  stopVoice(); // dừng cái cũ nếu có
  audio = new Audio(url);
  audio.play().then(() => {
    isPlaying.value = true;
    audio?.addEventListener('ended', () => {
      isPlaying.value = false
    })
  }).catch(err => {
    toast.error('Không thể phát âm thanh', {
      position: 'top',
      duration: 8000
    })
    isPlaying.value = false
  })
}

// Dừng âm thanh
const stopVoice = () => {
  if (audio) {
    audio.pause();
    audio.currentTime = 0;
    isPlaying.value = false
  }
}

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
          <span style="width: 600px; text-align: center;" class="text-black bot-desc">{{ getBotData?.description
          }}</span>
        </div>

        <div v-for="(message, index) in messages" :key="index"
          :class="message.sender === 'user' ? 'chat chat-end' : 'chat chat-start'">

          <!-- Avatar Bot -->
          <div v-if="message.sender === 'bot'" class="chat-image avatar">
            <div v-if="getBotData?.image" class="avatar">
              <div class="w-8 rounded-full">
                <img :src="getBotData?.image" alt="Bot Avatar" />
              </div>
            </div>
          </div>

          <div v-else
            v-if="message.fileUser != null
              && message.fileUser !== '' && message.fileUser != undefined && message.fileType != '' && message.fileType != null">
            <img v-if="message.fileType.startsWith('image/')" :src="message.fileUser"
              class="w-96 pb-4 rounded-lg cursor-pointer transition hover:scale-105" alt="User Uploaded Image"
              @click="openImage(message.fileUser)" />

            <!-- PDF -->
            <figure v-else-if="message.fileType === 'application/pdf'">
              <img src="https://upload.wikimedia.org/wikipedia/commons/8/87/PDF_file_icon.svg"
                class="w-full h-64 object-cover" alt="PDF Logo" @click="openImage(message.fileUser)" />
            </figure>

            <!-- Word -->
            <figure v-else-if="message.fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'">
              <img
                src="https://upload.wikimedia.org/wikipedia/commons/f/fd/Microsoft_Office_Word_%282019%E2%80%93present%29.svg"
                class="w-full h-64 object-cover" alt="Word Logo" @click="openImage(message.fileUser)" />
            </figure>

            <!-- TXT -->
            <figure v-else-if="message.fileType === 'text/plain'">
              <img src="https://upload.wikimedia.org/wikipedia/commons/2/23/Text-txt.svg"
                class="w-full h-64 object-cover" alt="TXT Logo" @click="openImage(message.fileUser)" />
            </figure>
          </div>

          <!-- Nội dung chat -->
          <div class="chat-bubble">
            <span v-if="message.content === 'Đang trả lời...'" class="typing-indicator">
              <span></span><span></span><span></span>
            </span>

            <template v-else-if="message.sender === 'bot'">
              <!-- Nếu chưa gõ xong thì hiển thị nội dung markdown thô -->
              <pre v-if="!message.isDone" class="whitespace-pre-wrap font-mono text-left">
                {{ message.displayContent }}<span class="blinking-cursor">|</span>
              </pre>

              <!-- Khi gõ xong thì hiển thị markdown HTML -->
              <span v-else v-html="message.displayContent" class="markdown-body"></span>
            </template>
            <div v-else-if="message.sender === 'user' && message.isDone">
              <span v-html="message.displayContent" class="markdown-body">
              </span>
              <button @click="copyMessage(message)" title="Copy">
                <svg v-if="!message.isCopied" xmlns="http://www.w3.org/2000/svg" width="24" height="24"
                  viewBox="0 0 24 24">
                  <path fill="#000"
                    d="M14 8H4c-1.103 0-2 .897-2 2v10c0 1.103.897 2 2 2h10c1.103 0 2-.897 2-2V10c0-1.103-.897-2-2-2" />
                  <path fill="#000" d="M20 2H10a2 2 0 0 0-2 2v2h8a2 2 0 0 1 2 2v8h2a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2" />
                </svg>
                <svg v-else xmlns="http://www.w3.org/2000/svg" width="24" height="24">
                  <path fill="#000" d="M9 16.2l-4.7-4.7 1.4-1.4 3.3 3.3 6.6-6.6 1.4 1.4z" />
                </svg>
              </button>
            </div>

            <div v-if="message.sender === 'bot' && message.isDone && message._id != ''" class="chat-actions">
              <button @click="copyMessage(message)" title="Copy">
                <svg v-if="!message.isCopied" xmlns="http://www.w3.org/2000/svg" width="24" height="24"
                  viewBox="0 0 24 24">
                  <path fill="#000"
                    d="M14 8H4c-1.103 0-2 .897-2 2v10c0 1.103.897 2 2 2h10c1.103 0 2-.897 2-2V10c0-1.103-.897-2-2-2" />
                  <path fill="#000" d="M20 2H10a2 2 0 0 0-2 2v2h8a2 2 0 0 1 2 2v8h2a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2" />
                </svg>
                <svg v-else xmlns="http://www.w3.org/2000/svg" width="24" height="24">
                  <path fill="#000" d="M9 16.2l-4.7-4.7 1.4-1.4 3.3 3.3 6.6-6.6 1.4 1.4z" />
                </svg>
              </button>
              <template v-if="message.status === 0">
                <!-- Like -->
                <button @click="handleLikeDislike(message, 1)" title="Like" :disabled="message._loading">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
                    <path fill="#000"
                      d="M23 10a2 2 0 0 0-2-2h-6.32l.96-4.57c.02-.1.03-.21.03-.32c0-.41-.17-.79-.44-1.06L14.17 1L7.59 7.58C7.22 7.95 7 8.45 7 9v10a2 2 0 0 0 2 2h9c.83 0 1.54-.5 1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73zM1 21h4V9H1z" />
                  </svg>
                </button>

                <!-- Dislike -->
                <button @click="handleLikeDislike(message, 2)" title="Dislike" :disabled="message._loading">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
                    <path fill="#000"
                      d="M19 15h4V3h-4m-4 0H6c-.83 0-1.54.5-1.84 1.22l-3.02 7.05c-.09.23-.14.47-.14.73v2a2 2 0 0 0 2 2h6.31l-.95 4.57c-.02.1-.03.2-.03.31c0 .42.17.79.44 1.06L9.83 23l6.58-6.59c.37-.36.59-.86.59-1.41V5a2 2 0 0 0-2-2" />
                  </svg>
                </button>
              </template>

              <!-- Đã nhấn Like -->
              <template v-else-if="message.status === 1">
                <button title="Đã thích" disabled>
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
                    <path fill="#000"
                      d="M23 10a2 2 0 0 0-2-2h-6.32l.96-4.57c.02-.1.03-.21.03-.32c0-.41-.17-.79-.44-1.06L14.17 1L7.59 7.58C7.22 7.95 7 8.45 7 9v10a2 2 0 0 0 2 2h9c.83 0 1.54-.5 1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73zM1 21h4V9H1z" />
                  </svg>
                </button>
              </template>

              <!-- Đã nhấn Dislike -->
              <template v-else-if="message.status === 2">
                <button title="Đã không thích" disabled>
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
                    <path fill="#000"
                      d="M19 15h4V3h-4m-4 0H6c-.83 0-1.54.5-1.84 1.22l-3.02 7.05c-.09.23-.14.47-.14.73v2a2 2 0 0 0 2 2h6.31l-.95 4.57c-.02.1-.03.2-.03.31c0 .42.17.79.44 1.06L9.83 23l6.58-6.59c.37-.36.59-.86.59-1.41V5a2 2 0 0 0-2-2" />
                  </svg>
                </button>
              </template>

              <!-- Nút phát hoặc dừng âm thanh -->
              <button v-if="!isPlaying" @click="handlePlay(message)" :disabled="isLoadingVoice" title="Phát âm thanh">
                <svg v-if="!isLoadingVoice" xmlns="http://www.w3.org/2000/svg" width="24" height="24"
                  viewBox="0 0 16 16">
                  <path fill="#000"
                    d="M9 2.5a.5.5 0 0 0-.849-.358l-2.927 2.85H3.5a1.5 1.5 0 0 0-1.5 1.5v2.99a1.5 1.5 0 0 0 1.5 1.5h1.723l2.927 2.875A.5.5 0 0 0 9 13.5zm1.111 2.689a.5.5 0 0 1 .703-.08l.002.001l.002.002l.005.004l.015.013l.046.04q.055.05.142.142c.113.123.26.302.405.54c.291.48.573 1.193.573 2.148c0 .954-.282 1.668-.573 2.148a3.4 3.4 0 0 1-.405.541a3 3 0 0 1-.202.196l-.008.007h-.001s-.447.243-.703-.078a.5.5 0 0 1 .075-.7l.002-.002l-.001.001l.002-.001h-.001l.018-.016q.028-.025.085-.085a2.4 2.4 0 0 0 .284-.382c.21-.345.428-.882.428-1.63s-.218-1.283-.428-1.627a2.4 2.4 0 0 0-.368-.465l-.018-.016a.5.5 0 0 1-.079-.701m1.702-2.08a.5.5 0 1 0-.623.782l.011.01l.052.045q.072.063.201.195c.17.177.4.443.63.794c.46.701.92 1.733.92 3.069a5.5 5.5 0 0 1-.92 3.065c-.23.35-.46.614-.63.79a4 4 0 0 1-.252.24l-.011.01h-.001a.5.5 0 0 0 .623.782l.033-.027l.075-.065c.063-.057.15-.138.253-.245a6.4 6.4 0 0 0 .746-.936a6.5 6.5 0 0 0 1.083-3.614a6.54 6.54 0 0 0-1.083-3.618a6.5 6.5 0 0 0-.745-.938a5 5 0 0 0-.328-.311l-.023-.019l-.007-.006l-.002-.002zM10.19 5.89l-.002-.001Z" />
                </svg>

                <svg v-else class="animate-spin" xmlns="http://www.w3.org/2000/svg" width="24" height="24"
                  viewBox="0 0 24 24">
                  <path fill="#000" d="M12 2v2a8 8 0 1 1-8 8H2a10 10 0 1 0 10-10z" />
                </svg>
              </button>

              <button v-else @click="stopVoice" title="Dừng âm thanh">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
                  <path fill="#000" d="M6 6h12v12H6z" />
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
          <!-- Preview section -->
          <Transition name="fade">
            <div v-if="previewUrl" class="relative mr-2 w-full mb-2">
              <!-- Nút X -->
              <button @click="clearPreview"
                class="absolute top-0 right-0 bg-black bg-opacity-50 text-white rounded-full w-5 h-5 flex items-center justify-center z-10 hover:bg-opacity-75">
                ×
              </button>

              <!-- Overlay loading -->
              <div v-if="isUploading"
                class="absolute inset-0 bg-white bg-opacity-70 z-20 flex items-center justify-center">
                <span class="loader"></span>
              </div>

              <!-- Nếu là ảnh -->
              <div v-if="previewFileType?.startsWith('image/')"
                class="max-w-[150px] max-h-[150px] border rounded overflow-hidden relative">
                <img :src="previewFile" class="object-cover w-full h-auto max-h-[150px]" />
              </div>

              <!-- Nếu là file khác -->
              <div v-else class="bg-gray-100 text-sm px-2 py-1 rounded border max-w-[200px] truncate text-black">
                {{ previewFile }}
              </div>
            </div>
          </Transition>

          <!-- Input + buttons -->
          <div class="flex w-full items-center">
            <!-- Input -->
            <textarea v-model="newMessage" @input="autoResize" @keydown="handleKeydown" @paste="handlePaste"
              @dblclick="handleDoubleClick" placeholder="please chat here..."
              class="input-chat w-full border-none focus-within:ring-0 px-0 focus-visible:outline-none resize-none overflow-hidden"
              rows="1" ref="textareaRef"
              style="line-height: 1.5rem; max-height: calc(1.5rem * 10); overflow-y: auto;"></textarea>

            <label class="ml-2 cursor-pointer">
              <input type="file" accept=".png,.jpg,.jpeg,.webp,.gif" class="hidden" @change="handleFileUpload" />
              <svg xmlns="http://www.w3.org/2000/svg" class="icon w-6 h-6 text-primary" fill="currentColor"
                viewBox="0 0 24 24">
                <path
                  d="M21 19V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2ZM8.5 13.5 11 17l3.5-4.5L19 19H5l3.5-5.5ZM8 8a2 2 0 1 1 0 4 2 2 0 0 1 0-4Z" />
              </svg>
            </label>

            <!-- Upload PDF -->
            <!-- Gói cả 2 label vào 1 div và kiểm tra 1 lần -->

            <!-- Upload PDF -->
            <label class="ml-2 cursor-pointer">
              <input type="file" accept="application/pdf" class="hidden" @change="handleFileUpload" />
              <svg xmlns="http://www.w3.org/2000/svg" width="20px" height="20px" viewBox="0 0 15 15">
                <path fill="currentColor"
                  d="M3.5 8H3V7h.5a.5.5 0 0 1 0 1M7 10V7h.5a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-.5.5z" />
                <path fill="currentColor" fill-rule="evenodd"
                  d="M1 1.5A1.5 1.5 0 0 1 2.5 0h8.207L14 3.293V13.5a1.5 1.5 0 0 1-1.5 1.5h-10A1.5 1.5 0 0 1 1 13.5zM3.5 6H2v5h1V9h.5a1.5 1.5 0 1 0 0-3m4 0H6v5h1.5A1.5 1.5 0 0 0 9 9.5v-2A1.5 1.5 0 0 0 7.5 6m2.5 5V6h3v1h-2v1h1v1h-1v2z"
                  clip-rule="evenodd" />
              </svg>
            </label>

            <!-- Upload Word or TXT -->
            <label class="ml-2 cursor-pointer">
              <input type="file" accept=".docx,.txt" class="hidden" @change="handleFileUpload" />
              <svg xmlns="http://www.w3.org/2000/svg" width="20px" height="20px" viewBox="0 0 15 15">
                <path fill="currentColor"
                  d="M3 10V7h.5a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-.5.5zm4-2.5a.5.5 0 0 1 1 0v2a.5.5 0 0 1-1 0z" />
                <path fill="currentColor" fill-rule="evenodd"
                  d="M1 1.5A1.5 1.5 0 0 1 2.5 0h8.207L14 3.293V13.5a1.5 1.5 0 0 1-1.5 1.5h-10A1.5 1.5 0 0 1 1 13.5zM3.5 6H2v5h1.5A1.5 1.5 0 0 0 5 9.5v-2A1.5 1.5 0 0 0 3.5 6m4 0A1.5 1.5 0 0 0 6 7.5v2a1.5 1.5 0 0 0 3 0v-2A1.5 1.5 0 0 0 7.5 6m2.5 5V6h3v2h-1V7h-1v3h1V9h1v2z"
                  clip-rule="evenodd" />
              </svg> </label>

            <!-- Loading icon -->
            <svg v-if="isTyping" class="w-10 h-10 ml-2 text-gray-400 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
            </svg>

            <!-- Send icon -->
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
.loader {
  border: 4px solid #f3f3f3;
  border-top: 4px solid #3498db;
  border-radius: 50%;
  width: 30px;
  height: 30px;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }

  100% {
    transform: rotate(360deg);
  }
}
.markdown-content table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 1rem;
  font-size: 0.95rem;
  overflow-x: auto;
  display: block;
}

.markdown-content th,
.markdown-content td {
  border: 1px solid #ddd;
  padding: 8px 12px;
  text-align: left;
}

.markdown-content tr:nth-child(even) {
  background-color: #f9f9f9;
}

.markdown-content th {
  background-color: #f2f2f2;
  font-weight: 600;
}

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

.markdown-body pre {
  background-color: #f6f8fa;
  padding: 10px;
  border-radius: 6px;
  overflow-x: auto;
  max-width: 100%;
}

.markdown-body code {
  font-family: monospace;
  word-break: break-word;
  white-space: pre-wrap;
}

.bot-desc {
  display: -webkit-box;
  -webkit-line-clamp: 3;
  /* Số dòng muốn hiển thị */
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
}

@media (min-width: 320px) and (max-width: 600px) {
  .layout-input {
    padding: 0px 10px;
  }
}
</style>
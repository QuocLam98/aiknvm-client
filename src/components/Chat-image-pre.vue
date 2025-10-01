<script setup lang="ts">
import { ref, onMounted, nextTick, watch } from 'vue'
import axios from 'axios'
import { useToast } from 'vue-toast-notification';
import rehypeHighlight from 'rehype-highlight'
import { useHistoryChat } from '@/composables/useHistoryChat'
import { useRoute, useRouter } from 'vue-router'

interface ChatMessage {
  sender: 'user' | 'bot'
  content: string
  createdAt: string
  imageUrl?: string
  fileUser?: string,
  history?: string,
  _id?: string
}

interface Bot {
  _id: string,
  name: string,
  description: string,
  template: string,
  image?: string
}

const isLoaded = ref(false)

const onImageLoad = () => {
  isLoaded.value = true
}
const route = useRoute()
const router = useRouter()
const code = ref<string>('')
const isTyping = ref(false) // 👈 Bắt đầu gõ
const { loadHistoryChat } = useHistoryChat()
const historyChat = ref('')
const textareaRef = ref<HTMLTextAreaElement | null>(null)
const toast = useToast()
const messages = ref<ChatMessage[]>([])
const chatContainer = ref<HTMLElement | null>(null)
const previewFile = ref<File | null>(null)
const previewUrl = ref<string | null>(null)
const newMessage = ref('')
const isBotTyping = ref(false);  // Trạng thái đang trả lời
const urlServer = import.meta.env.VITE_URL_SERVER
const botImage = ref('')
const getBotData = ref<Bot>()

const renderMarkdown = async (markdown: string) => {
  const { unified } = await import('unified')
  const remarkParse = (await import('remark-parse')).default
  const rehypeStringify = (await import('rehype-stringify')).default
  const remarkRehype = (await import('remark-rehype')).default

  const file = await unified()
    .use(remarkParse)
    .use(remarkRehype)
    .use(rehypeHighlight)
    .use(rehypeStringify)
    .process(markdown)

  return String(file)
}

const clearPreview = () => {
  previewUrl.value = ''
  previewFile.value = null
}

const getBot = async () => {
  try {
    const res = await axios.get(`${urlServer}/get-bot/` + botImage.value);
    getBotData.value = res.data  // <-- đây
  }
  catch {
    toast.error('Lỗi khi lấy thông tin bot!', {
      position: 'top',
      duration: 3000
    });
  }
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

onMounted(() => {
  botImage.value = import.meta.env.VITE_CREATE_IMAGE_PREMIUM
  getBot()
  autoResize()
})

function isValidUrl(str: string) {
  const pattern = /^(https?:\/\/[^\s]+)$/;
  return pattern.test(str);
}

const openImage = (url: string) => {
  window.open(url, '_blank');
}

const sendMessage = async () => {
  const formData = new FormData()
  const content = newMessage.value.trim()
  const token = localStorage.getItem('token')

  if (!content) {
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

  formData.append('bot', botImage.value)
  formData.append('token', token || '')
  if (content) formData.append('content', content)
  if (historyChat.value) {
    formData.append('historyChat', historyChat.value)
  }
  if (previewFile.value) formData.append('file', previewFile.value)
  
  isTyping.value = true // 👈 Bắt đầu gõ
  messages.value.push({
    sender: 'user',
    content: content,
    fileUser: previewUrl.value ? previewUrl.value : '',
    createdAt: new Date().toISOString()
  })
  nextTick(() => {
    chatContainer.value?.scrollTo({ top: chatContainer.value.scrollHeight, behavior: 'smooth' })
  })
  newMessage.value = ''
  previewUrl.value = null
  isBotTyping.value = true
  nextTick(() => {
    autoResize()
  })
  messages.value.push({
    sender: 'bot',
    content: 'Đang trả lời...',
    createdAt: new Date().toISOString()
  })
  
  previewFile.value = null

  try {
    const response = await axios.post(`${urlServer}/create-message-image-pre`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })

    if (response.data.status === 400)
    {
      router.push('/login')
      localStorage.clear()
      return
    }

    previewFile.value = null
    previewUrl.value = null
    messages.value.pop()
    const { contentBot, createdAt, history, _id } = response.data // Lấy thêm imageUrl từ response

    // Kiểm tra xem contentBot có phải là một URL không
    messages.value.push({
      sender: 'bot',
      content: contentBot,
      imageUrl: isValidUrl(contentBot) ? contentBot : null,
      createdAt,
      history: history,
      _id: _id
    })


    if (historyChat.value == null || historyChat.value === '') {

      historyChat.value = response.data._id

      await axios.put(`${urlServer}/update-message-history`, {
        id: _id,
        history: historyChat.value
      })

      loadHistoryChat()
    }

    nextTick(() => {
      chatContainer.value?.scrollTo({ top: chatContainer.value.scrollHeight, behavior: 'smooth' })
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
      messages.value.splice(typingIndex, 1);
    }
    // Thêm câu trả lời lỗi
    messages.value.push({
      sender: 'bot',
      content: 'Bạn hãy gõ lại câu hỏi rõ ràng hơn.',
      createdAt: new Date().toISOString(),
    })
    isTyping.value = false // 👈 Bắt đầu gõ
  } finally {
    isBotTyping.value = false
    isTyping.value = false // 👈 Bắt đầu gõ
  }

}

const downloadImage = async (imageUrl: string) => {
  try {
    const response = await axios.post(`${urlServer}/download-file`, {
      url: imageUrl
    }, {
      responseType: 'blob' // Bắt buộc để nhận đúng dạng file
    });

    const blob = new Blob([response.data]);
    const blobUrl = window.URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = imageUrl.split('/').pop() || 'download.jpg';
    link.click();
    window.URL.revokeObjectURL(blobUrl);
  } catch (err) {
    toast.error('Tải ảnh thất bại!', {
      position: 'top',
      duration: 3000
    })
  }
};

const handlePaste = (event: ClipboardEvent) => {
  // Kiểm tra điều kiện nếu botIdSelect === botImage thì ngừng sự kiện paste

  // Kiểm tra clipboard có dữ liệu hay không
  const items = event.clipboardData?.items;
  if (!items) return;

  // Kiểm tra tất cả các items trong clipboard
  for (const item of items) {
    if (item.kind === 'file') {
      const file = item.getAsFile();
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          // Lưu thông tin preview file vào các biến ref
          previewFile.value = file;
          previewUrl.value = e.target?.result as string; // Lưu preview URL
        };
        reader.readAsDataURL(file); // Convert file thành base64 để preview
      }
    }
  }
}

const handleFileUpload = (e: Event) => {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return

  const imageTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif']
  const documentTypes = ['application/pdf', 'text/plain', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
  if (file.size > 20 * 1024 * 1024) {
    toast.error('Dung lượng file không được quá 20MB.', {
      position: 'top',
      duration: 8000
    })
    return
  }
  else if (documentTypes.includes(file.type) || imageTypes.includes(file.type)) {
    previewFile.value = file;
    previewUrl.value = URL.createObjectURL(file);
  }
  else {
    toast.error('Định dạng file không được hỗ trợ.', {
      position: 'top',
      duration: 8000
    })
  }
  (e.target as HTMLInputElement).value = ''
}

const handleKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault()
    sendMessage()
  }
  // Shift + Enter thì không làm gì để textarea tự xuống dòng
}

const handleDoubleClick = (event: MouseEvent) => {
  const textarea = event.target as HTMLTextAreaElement
  textarea.select()
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
          <span style="width: 600px; text-align: center;" class="text-black">{{ getBotData?.description }}</span>
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
              && message.fileUser !== '' && message.fileUser != undefined">
            <img :src="message.fileUser"
              class="w-96 pb-4 rounded-lg cursor-pointer transition hover:scale-105" alt="User Uploaded Image"
              @click="openImage(message.fileUser)" />
          </div>

          <!-- Nội dung chat -->
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
              <!-- Nút tải xuống -->
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
          <!-- Preview section -->
          <Transition name="fade">
            <div v-if="previewUrl" class="relative mr-2 w-full mb-2">
              <!-- Nút X -->
              <button @click="clearPreview"
                class="absolute top-0 right-0 bg-black bg-opacity-50 text-white rounded-full w-5 h-5 flex items-center justify-center z-10 hover:bg-opacity-75">
                ×
              </button>

              <!-- Nếu là ảnh -->
              <div v-if="previewFile?.type.startsWith('image/')"
                class="max-w-[150px] max-h-[150px] border rounded overflow-hidden">
                <img :src="previewUrl" class="object-cover w-full h-auto max-h-[150px]" />
              </div>
            </div>
          </Transition>

          <!-- Input + buttons -->
          <div class="flex w-full items-center">
            <!-- Input -->
            <textarea v-model="newMessage" @input="autoResize" @keydown.enter="sendMessage" @paste="handlePaste"
              placeholder="Xin mời nhập câu hỏi..."
              class="input-chat w-full border-none focus-within:ring-0 px-0 focus-visible:outline-none resize-none overflow-hidden"
              maxlength="1000" rows="1" ref="textareaRef"
              style="line-height: 1.5rem; max-height: calc(1.5rem * 10); overflow-y: auto;"></textarea>

            <label class="ml-2 cursor-pointer">
              <input type="file" accept="image/*" class="hidden" @change="handleFileUpload" />
              <svg xmlns="http://www.w3.org/2000/svg" class="icon w-10 h-10 text-primary" fill="currentColor"
                viewBox="0 0 24 24">
                <path
                  d="M21 19V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2ZM8.5 13.5 11 17l3.5-4.5L19 19H5l3.5-5.5ZM8 8a2 2 0 1 1 0 4 2 2 0 0 1 0-4Z" />
              </svg>
            </label>

            <!-- Send button -->
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
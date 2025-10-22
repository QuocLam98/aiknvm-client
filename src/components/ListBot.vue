<script setup lang="ts">
import { ref, computed, watch, onMounted, reactive } from 'vue'
import BasePagination from './BasePagination.vue'
import axios from 'axios'
import { useToast } from 'vue-toast-notification';
import debounce from 'lodash.debounce'
import { eventBus } from '../stores/eventBus';
import { useListBot } from '@/composables/useListBot';

// Interface dữ liệu người dùng
interface Bot {
  _id: string
  name: string
  createdAt: string
  templateMessage: string
  image: string
  description: string,
  status?: number,
  priority?: string,
  models: string
}

interface BotFileItem {
  id: string
  name: string
  previewUrl: string
  type: string
}

const TOAST_DEFAULT_DURATION = 3000
const TOAST_LONG_DURATION = 8000
const ALLOWED_UPLOAD_TYPES = new Set([
  'text/plain',
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword'
])

const getDialog = (id: string) => document.getElementById(id) as HTMLDialogElement | null
const openDialog = (id: string) => getDialog(id)?.showModal()
const closeDialog = (id: string) => getDialog(id)?.close()

// State
const { loadBots } = useListBot()
const keyword = ref('')
const bots = ref<Bot[]>([])
const totalItems = ref(0)
const currentPage = ref(1)
const perPage = ref(10)
const perPageOptions = ref([10, 20, 50, 100])
const loading = ref(false)
const botEdit = ref<Bot | null>(null)
const botDetail = reactive({
  name: '',
  templateMessage: '',
  description: '',
  image: '',
  status: '0',
  priority: '0',
  models: '1'
})
const titleModal = ref('')
const toast = useToast()
const showToastError = (message: string, duration = TOAST_DEFAULT_DURATION) => {
  toast.error(message, {
    position: 'top',
    duration
  })
}

const showToastSuccess = (message: string, duration = TOAST_DEFAULT_DURATION) => {
  toast.success(message, {
    position: 'top',
    duration
  })
}
const urlServer = import.meta.env.VITE_URL_SERVER
const uploadFileInput = ref<HTMLInputElement>()
const imageFileInput = ref<HTMLInputElement>()
const selectedFile = ref<{ previewUrl: string; file: File } | null>(null)
const selectedFiles = ref<BotFileItem[]>([])
const idBot = ref('')
const imageFileDetail = ref<File | null>(null)
const previewImageUrlDetail = ref<string | null>(null)
const selectedFieldId = ref('')

// Pagination handled by BasePagination component

const fetchBots = async () => {
  loading.value = true
  try {
    const response = await axios.get(`${urlServer}/list-bot`, {
      params: {
        page: currentPage.value,
        limit: perPage.value,
        keyword: keyword.value
      }
    })
    bots.value = response.data.data
    totalItems.value = response.data.total
  } catch (error) {
    console.error('Lỗi khi lấy dữ liệu:', error)
    showToastError('Lỗi khi lấy danh sách bot!')
  } finally {
    loading.value = false
  }
}

function triggerFileInput() {
  uploadFileInput.value?.click()
}

function triggerFileInputDetail() {
  imageFileInput.value?.click()
}

//xử lý modal

const closeModalFile = () => {
  closeDialog('modal_bot_file')
}

const closeModelAddFile = () => {
  if (selectedFile.value?.previewUrl) {
    URL.revokeObjectURL(selectedFile.value.previewUrl)
  }
  selectedFile.value = null
  closeDialog('modal_bot_chosse_file')
  openDialog('modal_bot_file')
  if (uploadFileInput.value) uploadFileInput.value.value = ''
}

const closeModal = () => {
  botDetail.name = ''
  botDetail.templateMessage = ''
  botDetail.description = ''
  botDetail.priority = '0'
  botEdit.value = null
  selectedFieldId.value = ''
  resetImage({ clearPreview: true })

  closeDialog('modal_bot_detail')
}


const openModalChoose = () => {
  openDialog('modal_bot_chosse_file')
  closeDialog('modal_bot_file')
}

//xử lý file

const uploadImage = async () => {
  if (!selectedFile.value) {
    showToastError('Vui lòng chọn file tải lên!')
    return;
  }

  try {
    const formData = new FormData();
    formData.append('bot', idBot.value); // idBot.value là string
    formData.append('file', selectedFile.value.file); // file là File object

    await axios.post(`${urlServer}/create-file-bot`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });

    showToastSuccess('Tải file thành công!')

    if (selectedFile.value.previewUrl) {
      URL.revokeObjectURL(selectedFile.value.previewUrl)
    }
    selectedFile.value = null
    if (uploadFileInput.value) uploadFileInput.value.value = ''

    closeDialog('modal_bot_chosse_file')
    if (idBot.value) await loadBotFiles(idBot.value)
  } catch (error) {
    showToastError('Lỗi khi tải file!')
    closeDialog('modal_bot_chosse_file')
  }
}

interface ResetImageOptions {
  clearPreview?: boolean
}

const resetImage = (options: ResetImageOptions = {}) => {
  const { clearPreview = false } = options

  if (previewImageUrlDetail.value?.startsWith('blob:')) {
    URL.revokeObjectURL(previewImageUrlDetail.value)
  }

  if (clearPreview) {
    previewImageUrlDetail.value = ''
  }

  imageFileDetail.value = null
  if (imageFileInput.value) imageFileInput.value.value = ''
}

const isImageFile = (file: BotFileItem) => file.type?.startsWith('image/')

const removeFile = async (id: string) => {
  try {
    await axios.put(`${urlServer}/delete-bot-file/` + id)
    selectedFiles.value = selectedFiles.value.filter(file => file.id !== id)
    showToastSuccess('Xóa file thành công!')
  } catch (error) {
    showToastError('Lỗi khi xóa file!')
  }
}

const handleFileChange = (event: Event) => {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];

  if (file) {
    if (!ALLOWED_UPLOAD_TYPES.has(file.type)) {
      input.value = ''
      showToastError('Sai định dạng file !')
      return
    }

    if (selectedFile.value?.previewUrl) {
      URL.revokeObjectURL(selectedFile.value.previewUrl)
    }

    const previewUrl = URL.createObjectURL(file)
    selectedFile.value = { file, previewUrl }
  }
}

const handleImageChange = (e: Event) => {
  const target = e.target as HTMLInputElement
  const file = target.files?.[0]
  if (file) {
    if (previewImageUrlDetail.value) {
      URL.revokeObjectURL(previewImageUrlDetail.value)
    }
    imageFileDetail.value = file
    previewImageUrlDetail.value = URL.createObjectURL(file)
  }
}

const confirmDelete = async (id: string) => {
  const confirmed = confirm('Bạn có chắc chắn muốn xóa người dùng này không?')
  if (!confirmed) return

  try {
    await axios.put(`${urlServer}/delete-bot/${id}`)
    bots.value = bots.value.filter(bot => bot._id !== id)
    showToastSuccess('Xóa thành công bot!')
    if (bots.value.length === 1 && currentPage.value > 1) {
      currentPage.value--
    }
    await fetchBots()
    eventBus.reloadBots();
  } catch (error) {
    showToastError('Lỗi xóa bot thất bại!')
  }
}

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr)

  const pad = (n: number) => n.toString().padStart(2, '0')

  const day = pad(date.getDate())
  const month = pad(date.getMonth() + 1)
  const year = date.getFullYear()
  const hour = pad(date.getHours())
  const minute = pad(date.getMinutes())
  const second = pad(date.getSeconds())

  return `${day}/${month}/${year} ${hour}:${minute}:${second}`
}

const debouncedFetch = debounce(() => {
  currentPage.value = 1
  fetchBots()
}, 500)

//xử lý api
const getBot = (data: any) => {
  botEdit.value = data
  botDetail.name = botEdit.value?.name ?? ''
  botDetail.description = botEdit.value?.description ?? ''
  botDetail.templateMessage = botEdit.value?.templateMessage ?? ''
  previewImageUrlDetail.value = botEdit.value?.image ?? '' // Giả sử dữ liệu trả về có trường `image`
  botDetail.status = botEdit.value?.status?.toString() ?? '0'
  botDetail.priority = botEdit.value?.priority ?? '0'
}

const loadBotFiles = async (botId: string) => {
  if (!botId) {
    selectedFiles.value = []
    return
  }

  try {
    const { data } = await axios.get(`${urlServer}/get-bot-file/${botId}`)

    selectedFiles.value = Array.isArray(data)
      ? data.map((item: any) => ({
        id: item._id,
        name: getFileNameFromUrl(item.url),
        previewUrl: item.url,
        type: item.typeFile ?? ''
      }))
      : []
  } catch (error) {
    console.error('Error fetching bot files:', error)
    selectedFiles.value = []
    showToastError('Lỗi khi lấy danh sách file!')
  }
}

const getFileDetail = async (id: string) => {
  idBot.value = id
  await loadBotFiles(id)
  openDialog('modal_bot_file')
}

const getFileType = (file: BotFileItem): string => {
  const type = file.type?.toLowerCase() ?? ''

  if (type.startsWith('image/')) {
    return type.split('/')[1]?.toUpperCase() ?? 'IMAGE'
  }

  if (type.includes('pdf')) return 'PDF'
  if (type.includes('word') || type.includes('doc')) return 'DOCX'
  if (type.includes('text')) return 'TXT'

  const extension = file.name.split('.').pop()?.toUpperCase()
  return extension || 'UNKNOWN'
}

const getFileNameFromUrl = (url: string) => {
  return decodeURIComponent(url.split('/').pop() || 'unknown');
}

const getBotDetail = async (id: string) => {
  resetImage({ clearPreview: true })

  if (id === '0') {
    titleModal.value = 'Thêm mới bot AI'
    botEdit.value = null
    botDetail.name = ''
    botDetail.templateMessage = ''
    botDetail.description = ''
    botDetail.priority = '0'
    botDetail.status = '0'
    botDetail.models = '1'
    openDialog('modal_bot_detail')
    return
  }

  titleModal.value = 'Cập nhật bot AI'
  const findBot = bots.value.find(x => x._id === id)

  if (!findBot) {
    showToastError('Không tìm thấy bot!')
    return
  }

  getBot(findBot)
  openDialog('modal_bot_detail')
}

const updateBotDetail = async () => {
  const formData = new FormData()
  formData.append('name', botDetail.name || '')
  formData.append('templateMessage', botDetail.templateMessage || '')
  formData.append('description', botDetail.description || '')
  formData.append('status', botDetail.status)
  formData.append('priority', botDetail.priority || '0')
  formData.append('models', botDetail.models || '1')
  if (imageFileDetail.value) formData.append('image', imageFileDetail.value)

  const isCreate = !botEdit.value?._id

  try {
    const response = isCreate
      ? await axios.post(`${urlServer}/registerBot`, formData)
      : await axios.put(`${urlServer}/update-bot/${botEdit.value!._id}`, formData)

    if (isCreate) {
      bots.value.unshift(response.data)
      selectedFieldId.value = ''
      botDetail.priority = '0'
      showToastSuccess('Thêm mới thành công!')
    } else {
      const index = bots.value.findIndex(x => x._id === response.data._id)
      if (index !== -1) {
        bots.value[index] = response.data
      }
      showToastSuccess('Cập nhật thành công!')
    }

    resetImage({ clearPreview: true })
    closeDialog('modal_bot_detail')
    await loadBots()
  } catch (error) {
    showToastError('Lỗi khi lưu dữ liệu!')
    closeDialog('modal_bot_detail')
  }
}

watch(keyword, debouncedFetch)

watch([currentPage, perPage], fetchBots)

onMounted(fetchBots)
</script>

<template>
  <div class="lg:px-10 pb-10 pt-10 min-h-[calc(100vh-5rem)]">
    <div class="p-4 bg-base-200 shadow">
      <div class="flex items-center justify-between">
        <input type="text" v-model="keyword" placeholder="Tìm kiếm bot theo tên..."
          class="input search input-bordered w-full max-w-xs" />
        <button class="btn" @click="getBotDetail('0')">
          Thêm mới
        </button>
      </div>
      <div class="">
        <div v-if="loading" class="text-center py-5 text-lg font-semibold text-gray-500">
          Đang tải dữ liệu...
        </div>

        <div v-else class="overflow-x-auto">
          <table class="table table-auto">
            <thead>
              <tr>
                <th>#</th>
                <th>Tên</th>
                <th>Ngày tạo</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(bot, index) in bots" :key="index">
                <td>{{ (currentPage - 1) * perPage + index + 1 }}</td>
                <td>{{ bot.name }}</td>
                <td>{{ formatDate(bot.createdAt) }}</td>
                <td>
                  <button class="btn btn-ghost btn-xs" @click="getBotDetail(bot._id)">
                    <!-- icon giữ nguyên -->
                    <svg xmlns="http://www.w3.org/2000/svg" width="20px" height="20px" viewBox="0 0 512 512">
                      <path fill="currentColor"
                        d="M441 58.9L453.1 71c9.4 9.4 9.4 24.6 0 33.9L424 134.1L377.9 88L407 58.9c9.4-9.4 24.6-9.4 33.9 0zM209.8 256.2L344 121.9l46.1 46.1l-134.3 134.2c-2.9 2.9-6.5 5-10.4 6.1L186.9 325l16.7-58.5c1.1-3.9 3.2-7.5 6.1-10.4zM373.1 25L175.8 222.2c-8.7 8.7-15 19.4-18.3 31.1l-28.6 100c-2.4 8.4-.1 17.4 6.1 23.6s15.2 8.5 23.6 6.1l100-28.6c11.8-3.4 22.5-9.7 31.1-18.3L487 138.9c28.1-28.1 28.1-73.7 0-101.8L474.9 25c-28.1-28.1-73.7-28.1-101.8 0M88 64c-48.6 0-88 39.4-88 88v272c0 48.6 39.4 88 88 88h272c48.6 0 88-39.4 88-88V312c0-13.3-10.7-24-24-24s-24 10.7-24 24v112c0 22.1-17.9 40-40 40H88c-22.1 0-40-17.9-40-40V152c0-22.1 17.9-40 40-40h112c13.3 0 24-10.7 24-24s-10.7-24-24-24z" />
                    </svg>
                  </button>
                  <button class="btn btn-ghost btn-xs" @click="getFileDetail(bot._id)">
                    <!-- icon giữ nguyên -->
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
                      <g fill="none" stroke="#000" stroke-linecap="round" stroke-linejoin="round" stroke-width="2">
                        <path stroke-dasharray="72" stroke-dashoffset="72" d="M3 14v-9h18v14h-18v-5">
                          <animate fill="freeze" attributeName="stroke-dashoffset" dur="0.6s" values="72;0" />
                        </path>
                        <path stroke-dasharray="24" stroke-dashoffset="24" stroke-width="1" d="M3 16l4 -3l3 2l6 -5l5 4">
                          <animate fill="freeze" attributeName="stroke-dashoffset" begin="0.6s" dur="0.4s"
                            values="24;0" />
                        </path>
                      </g>
                      <g fill="#000" fill-opacity="0">
                        <circle cx="7.5" cy="9.5" r="1.5">
                          <animate fill="freeze" attributeName="fill-opacity" begin="1s" dur="0.2s" values="0;1" />
                        </circle>
                        <path d="M3 16l4 -3l3 2l6 -5l5 4V19H3Z">
                          <animate fill="freeze" attributeName="fill-opacity" begin="1.3s" dur="0.5s" values="0;1" />
                        </path>
                      </g>
                    </svg>
                  </button>
                  <button class="btn btn-ghost btn-xs" @click="confirmDelete(bot._id)">
                    <!-- icon giữ nguyên -->
                    <svg xmlns="http://www.w3.org/2000/svg" width="20px" height="20px" viewBox="0 0 12 12">
                      <path fill="currentColor"
                        d="M5 3h2a1 1 0 0 0-2 0M4 3a2 2 0 1 1 4 0h2.5a.5.5 0 0 1 0 1h-.441l-.443 5.17A2 2 0 0 1 7.623 11H4.377a2 2 0 0 1-1.993-1.83L1.941 4H1.5a.5.5 0 0 1 0-1zm3.5 3a.5.5 0 0 0-1 0v2a.5.5 0 0 0 1 0zM5 5.5a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5M3.38 9.085a1 1 0 0 0 .997.915h3.246a1 1 0 0 0 .996-.915L9.055 4h-6.11z" />
                    </svg>
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="mt-4" v-if="totalItems > 0">
          <BasePagination
            :current-page="currentPage"
            :per-page="perPage"
            :total-items="totalItems"
            :per-page-options="perPageOptions"
            @update:page="val => currentPage = val"
            @update:perPage="val => { perPage = val; currentPage = 1 }"
          />
        </div>

        <!-- Nếu không có dữ liệu -->
        <div v-else class="text-center mt-4 text-gray-500">
          Không có dữ liệu để hiển thị.
        </div>

      </div>
    </div>
  </div>

  <dialog id="modal_bot_detail" class="modal" v-if="botDetail">
    <div class="modal-box max-w-7xl xl:max-w-[95vw] w-full bg-base-200">
      <div class="flex justify-between card-title">
        <h1>
          {{ titleModal }}
        </h1>
        <button class="btn btn-sm btn-circle btn-ghost absolute right-2 top-2" @click="closeModal">✕</button>
      </div>
      <section>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <!-- Upload ảnh -->
          <div class="flex items-center flex-col md:col-span-2">
            <label class="label">Ảnh</label>

            <!-- Label có sự kiện @click để chọn file -->
            <label class="cursor-pointer inline-block" @click="triggerFileInputDetail">
              <!-- Nếu có ảnh xem trước, hiển thị ảnh -->
              <div v-if="previewImageUrlDetail" class="avatar">
                <div class="w-32 rounded-full overflow-hidden border border-gray-300">
                  <img :src="previewImageUrlDetail" class="w-full h-full object-cover" />
                </div>
              </div>
              <!-- Nếu không có ảnh xem trước, hiển thị placeholder -->
              <div v-else
                class="w-24 h-24 rounded-xl border border-dashed border-gray-300 flex items-center justify-center text-gray-400">
                Chọn ảnh
              </div>
            </label>

            <!-- Input file ẩn -->
            <input
              ref="imageFileInput"
              type="file"
              class="hidden"
              accept="image/*"
              @change="handleImageChange"
            />
          </div>

          <!-- Tên bot -->
          <div>
            <label class="label">Tên</label>
            <input type="text" class="input input-bordered w-full" v-model="botDetail.name" />
          </div>

          <!-- <div>
            <label class="label">Lĩnh vực</label>
            <select
              class="select"
              style="width: 100% !important;"
              v-model="botDetail.field"
            >
              <option disabled value="">Chọn 1 lĩnh vực</option>
              <option
                v-for="field in listField"
                :key="field._id"
                :value="field._id"
              >
                {{ field.name }}
              </option>
            </select>
          </div> -->

          <div>
            <label class="label">Trạng thái</label>
            <select
              class="select"
              style="width: 100% !important;"
              v-model="botDetail.status"
            >
              <option value="0">Hoạt động</option>
              <option value="1">Bảo trì</option>
            </select>
          </div>

          <div>
            <label class="label">Ưu tiên</label>
            <input type="text" class="input input-bordered w-full" v-model="botDetail.priority" />
          </div>

          <div>
            <label class="label">Mô hình</label>
            <select
              class="select"
              style="width: 100% !important;"
              v-model="botDetail.models">
              <option value="1">Gemini</option>
              <option value="2">GPT</option>
              <option value="3">Gemini + GPT</option>
            </select>
          </div>

          <div>
            <label class="label">Mô tả</label>
            <textarea class="textarea textarea-bordered w-full" v-model="botDetail.description"
              rows="4"></textarea>
          </div>

          <!-- Mẫu tin nhắn -->
          <div class="md:col-span-2">
            <label class="label">Cấu hình câu trả lời</label>
            <textarea class="textarea textarea-bordered w-full" v-model="botDetail.templateMessage" rows="15"></textarea>
          </div>
        

          <!-- Nút lưu -->
          <div class="flex justify-end gap-2 mt-4 md:col-span-2">
            <button class="btn" @click="closeModal">Hủy</button>
            <button class="btn btn-primary" @click="updateBotDetail">Lưu</button>
          </div>
        </div>
      </section>
    </div>
    <form method="dialog" class="modal-backdrop">
      <button>close</button>
    </form>
  </dialog>

  <dialog id="modal_bot_file" class="modal">
    <div class="modal-box max-w-7xl max-h-screen xl:max-w-[95vw] w-full bg-base-200">
      <div class="flex justify-between card-title mb-4">
        <h1>{{ titleModal }}</h1>
        <button class="btn btn-sm btn-circle btn-ghost absolute right-2 top-2" @click="closeModalFile">✕</button>
      </div>

      <!-- Phần quản lý file -->
      <section>
        <div class="flex items-center justify-start mb-4 gap-4">
          <h2 class="text-lg font-semibold">Quản lý kho file</h2>
          <button class="btn btn-circle btn-success text-white" @click="openModalChoose">+</button>
        </div>

        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
          <!-- Nếu có file -->
          <template v-if="selectedFiles.length">
            <div v-for="(file, index) in selectedFiles" :key="index" class="card bg-base-100 shadow-md">
              <a :href="file.previewUrl" target="_blank" rel="noopener noreferrer" class="block">
                <figure v-if="isImageFile(file)">
                  <img :src="file.previewUrl ?? undefined" class="w-full h-64 object-cover" />
                </figure>

                <figure v-else-if="getFileType(file) === 'pdf'">
                  <img src="https://upload.wikimedia.org/wikipedia/commons/8/87/PDF_file_icon.svg" class="w-full h-64 object-cover" alt="PDF Logo" />
                </figure>

                <figure v-else-if="getFileType(file) === 'doc' || getFileType(file) === 'docx'">
                  <img src="https://upload.wikimedia.org/wikipedia/commons/f/fd/Microsoft_Office_Word_%282019%E2%80%93present%29.svg" class="w-full h-64 object-cover" alt="Word Logo" />
                </figure>

                <figure v-else-if="getFileType(file) === 'txt'">
                  <img src="https://upload.wikimedia.org/wikipedia/commons/2/23/Text-txt.svg" class="w-full h-64 object-cover" alt="TXT Logo" />
                </figure>

                <div class="card-body p-4">
                  <h2 class="card-title truncate">{{ file.name }}</h2>

                  <p class="text-sm text-gray-500" v-if="!isImageFile(file)">
                    Loại file: {{ getFileType(file) }}
                  </p>
                  <p class="text-sm text-gray-500" v-else>
                    Loại file: {{ getFileType(file) }}
                  </p>
                </div>
              </a>
              <div class="flex justify-center mt-2 mb-2">
                <button class="btn btn-circle btn-outline btn-error mr-2" @click="removeFile(file.id)">
                  🗑️
                </button>
              </div>
            </div>
          </template>

          <!-- Nếu chưa có file -->
          <div v-else
            class="col-span-full flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg p-4">
            <span class="text-gray-400">Chưa có file</span>
          </div>
        </div>
      </section>


    </div>

    <form method="dialog" class="modal-backdrop">
      <button>close</button>
    </form>
  </dialog>

  <dialog id="modal_bot_chosse_file" class="modal">
    <div class="modal-box max-w-md w-full bg-base-200">
      <!-- Tiêu đề -->
      <div class="flex justify-between items-center mb-4">
        <h1 class="text-xl font-bold">Thêm file mới</h1>
        <button class="btn btn-sm btn-circle btn-ghost" @click="closeModelAddFile">✕</button>
      </div>

      <!-- Chọn ảnh Upload -->
      <div class="mb-4">
        <label class="block text-gray-700 text-sm font-semibold mb-2">Chọn file Upload</label>

        <div
          class="relative flex items-center justify-center border-2 border-dashed border-gray-400 rounded-lg overflow-hidden w-100 h-100 cursor-pointer"
          @click="triggerFileInput">
          <template v-if="selectedFile">
            <img :src="selectedFile.previewUrl" class="object-cover w-full h-full" />
          </template>
          <template v-else>
            <div class="flex flex-col items-center justify-center text-gray-400">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-10 w-10" fill="none" viewBox="0 0 24 24"
                stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4-4m0 0l-4 4m4-4v12" />
              </svg>
              <span class="mt-2">Chọn file để upload</span>
            </div>
          </template>
        </div>

        <!-- input file ẩn -->
        <input ref="uploadFileInput" type="file" class="hidden" accept=".pdf,.txt,.doc,.docx"
          @change="handleFileChange" />
      </div>

      <!-- Nút Tải ảnh lên -->
      <div class="flex justify-end">
        <button class="btn btn-success text-white" @click="uploadImage">Tải file lên</button>
      </div>
    </div>

    <form method="dialog" class="modal-backdrop">
      <button>close</button>
    </form>
  </dialog>

</template>

<style>
thead,
tfoot {
  color: black;
}

.join button {
  background-color: #c2bfbf;
  color: black;
}

.btn-ghost:hover {
  background-color: unset;
  color: black
}

.select {
  width: 65px;
  background-color: white;
  border: 1px black solid;
}

.modal input,
.modal textarea {
  background-color: #f4f4f4;
  color: black;
}

.textarea-chat {
  --input-color: var(--color-base-content);
  box-shadow: 0 1px color-mix(in oklab, var(--input-color) calc(var(--depth) * 10%), #0000);
  outline: 2px solid var(--input-color);
  outline-offset: 2px;
  isolation: isolate;
}

.image-label {
  display: inline-block;
  text-align: center;
  cursor: pointer;
}

.image-preview {
  width: 100px;
  height: 100px;
  object-fit: cover;
  border-radius: 50%;
  border: 2px solid #ccc;
}

input[type="file"] {
  display: none;
}
</style>
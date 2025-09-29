<script setup lang="ts">
import { ref, computed, watch, onMounted, reactive } from 'vue'
import axios from 'axios'
import { useToast } from 'vue-toast-notification';
import debounce from 'lodash.debounce'
import { eventBus } from '../stores/eventBus';

// Interface dữ liệu người dùng
interface Bot {
  _id: string
  name: string
  createdAt: string
}

// State
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
  image: ''
})
const titleModal = ref('')
const toast = useToast();
const urlServer = import.meta.env.VITE_URL_SERVER
const idBot = ref('')

const totalPages = computed(() => Math.ceil(totalItems.value / perPage.value))
const visiblePages = computed(() => {
  const pages: number[] = []
  const range = 2
  for (let i = 1; i <= totalPages.value; i++) {
    if (
      i <= range ||
      i > totalPages.value - range ||
      (i >= currentPage.value - range && i <= currentPage.value + range)
    ) {
      pages.push(i)
    }
  }
  return pages
})

const fetchBots = async () => {
  loading.value = true
  try {
    const response = await axios.get(`${urlServer}/list-field`, {
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
  } finally {
    loading.value = false
  }
}

const confirmDelete = async (id: string) => {
  const confirmed = confirm('Bạn có chắc chắn muốn xóa lĩnh vực này không?')
  if (!confirmed) return

  try {
    await axios.put(`${urlServer}/delete-field/${id}`)
    bots.value = bots.value.filter(bot => bot._id !== id)
    toast.success('Xóa thành công lĩnh vực!', {
      position: 'top',
      duration: 3000
    });
    if (bots.value.length === 1 && currentPage.value > 1) {
      currentPage.value--
    }
    await fetchBots()
    eventBus.reloadBots();
  } catch (error) {
    toast.error('Lỗi xóa lĩnh vực thất bại!', {
      position: 'top',
      duration: 3000
    });
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
}

const getBotDetail = async (id: string) => {
  if (id === '0') {
    titleModal.value = 'Thêm mới lĩnh vực'
    botEdit.value = null
    botDetail.name = ''
    botDetail.templateMessage = ''
    botDetail.description = ''
    const modal: any = document.getElementById('modal_bot_detail')
    if (modal?.showModal) modal.showModal()
  }
  else {
    titleModal.value = 'Cập nhật lĩnh vực'
    const findBot = bots.value.find(x => x._id === id)
    getBot(findBot)
    // Mở modal
    const modal: any = document.getElementById('modal_bot_detail')
    if (modal?.showModal) modal.showModal()
  }
}

const updateBotDetail = async () => {
  const formData = new FormData()
  formData.append('name', botDetail.name)

  if (!botEdit.value?._id) {
    try {
      const response = await axios.post(`${urlServer}/registerField`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      bots.value.unshift(response.data)
      toast.success('Thêm mới thành công!', { position: 'top', duration: 3000 })
      const modal: any = document.getElementById('modal_bot_detail')
      if (modal?.close) modal.close()
    } catch (error) {
      toast.error('Lỗi khi lưu dữ liệu!', { position: 'top', duration: 3000 })
    }
  } else {
    try {
      const response = await axios.put(`${urlServer}/update-field/${botEdit.value._id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      const findIndex = bots.value.findIndex(x => x._id === response.data._id)
      bots.value[findIndex] = response.data
      toast.success('Cập nhật thành công!', { position: 'top', duration: 3000 })
      const modal: any = document.getElementById('modal_bot_detail')
      if (modal?.close) modal.close()
    } catch (error) {
      toast.error('Lỗi khi lưu dữ liệu!', { position: 'top', duration: 3000 })
    }
  }
}

watch([keyword], debouncedFetch)

watch([currentPage, perPage], fetchBots)

onMounted(fetchBots)

const changePerPage = () => {
  currentPage.value = 1
}

const closeModal = () => {
  botDetail.name = ''
  botEdit.value = null

  const modal: any = document.getElementById('modal_bot_detail')
  if (modal?.close) modal.close()
}
</script>

<template>
  <div class="lg:px-10 pb-10 pt-10 min-h-[calc(100vh-5rem)]">
    <div class="p-4 bg-base-200 shadow">
      <div class="flex items-center justify-between">
        <input type="text" v-model="keyword" placeholder="Tìm kiếm lĩnh vực theo tên..."
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
                  <button class="btn btn-ghost btn-xs" @click="confirmDelete(bot._id)">
                  <!-- icon giữ nguyên -->
                  <svg xmlns="http://www.w3.org/2000/svg" width="20px" height="20px" viewBox="0 0 24 24">
                    <g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"
                      stroke-width="2">
                      <path stroke-dasharray="20" stroke-dashoffset="20"
                        d="M3 21v-1c0 -2.21 1.79 -4 4 -4h4c2.21 0 4 1.79 4 4v1">
                        <animate fill="freeze" attributeName="stroke-dashoffset" dur="0.2s" values="20;0" />
                      </path>
                      <path stroke-dasharray="20" stroke-dashoffset="20"
                        d="M9 13c-1.66 0 -3 -1.34 -3 -3c0 -1.66 1.34 -3 3 -3c1.66 0 3 1.34 3 3c0 1.66 -1.34 3 -3 3Z">
                        <animate fill="freeze" attributeName="stroke-dashoffset" begin="0.2s" dur="0.2s"
                          values="20;0" />
                      </path>
                      <path stroke-dasharray="10" stroke-dashoffset="10" d="M15 3l6 6">
                        <animate fill="freeze" attributeName="stroke-dashoffset" begin="0.5s" dur="0.2s"
                          values="10;0" />
                      </path>
                      <path stroke-dasharray="10" stroke-dashoffset="10" d="M21 3l-6 6">
                        <animate fill="freeze" attributeName="stroke-dashoffset" begin="0.7s" dur="0.2s"
                          values="10;0" />
                      </path>
                    </g>
                  </svg>
                </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="flex justify-between items-center mt-4" v-if="totalItems > 0">
          <div class="join">
            <button class="join-item btn" :disabled="currentPage === 1" @click="currentPage--">
              Prev
            </button>

            <button v-if="currentPage > 3" class="join-item btn" @click="currentPage = 1">1</button>
            <span v-if="currentPage > 3" class="join-item btn">...</span>

            <button v-for="page in visiblePages" :key="page" class="join-item btn"
              :class="{ 'btn-active': page === currentPage }" @click="currentPage = page">
              {{ page }}
            </button>

            <span v-if="currentPage < totalPages - 2" class="join-item btn">...</span>
            <button v-if="currentPage < totalPages - 2" class="join-item btn" @click="currentPage = totalPages">
              {{ totalPages }}
            </button>

            <button class="join-item btn" :disabled="currentPage === totalPages" @click="currentPage++">
              Next
            </button>
          </div>

          <!-- Chọn số bản ghi / trang -->
          <select v-model="perPage" @change="changePerPage" class="select select-bordered">
            <option v-for="option in perPageOptions" :key="option" :value="option">{{ option }}</option>
          </select>
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

          <!-- Tên bot -->
          <div>
            <label class="label">Tên</label>
            <input type="text" class="input input-bordered w-full" v-model="botDetail.name" />
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
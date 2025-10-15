<script setup lang="ts">
import { ref, computed, watch, onMounted, reactive } from 'vue'
import BasePagination from './BasePagination.vue'
import axios from 'axios'
import debounce from 'lodash.debounce'
import { useToast } from 'vue-toast-notification'

interface user {
  _id: string,
  name: string,
}
interface bot {
  _id: string,
  name: string,
}
// Interface dữ liệu người dùng
interface Message {
  _id: string
  user: user
  bot: bot
  contentUser: string,
  contentBot: string,
  creditCost: number,
  createdAt: string,
  status: number,
  models: string,
}

const toast = useToast()
// State
const messages = ref<Message[]>([])
const searchTerm = ref('')
const totalItems = ref(0)
const currentPage = ref(1)
const perPage = ref(10)
const perPageOptions = ref([10, 20, 50, 100])
const loading = ref(false)
const urlServer = import.meta.env.VITE_URL_SERVER
const messageDetail = reactive({
  contentUser: '',
  contentBot: '',
})
// Pagination handled by BasePagination component

const getChatDetail = (id: string) => {
  const messageGet = messages.value.find(e => e._id === id)
  getChat(messageGet)
  const modal: any = document.getElementById('modal_message_detail')
  if (modal?.showModal) modal.showModal()

}

const getChat = (data: any) => {
  messageDetail.contentBot = data.contentBot ?? ''
  messageDetail.contentUser = data.contentUser ?? ''

}

const closeModal = () => {
  messageDetail.contentUser = ''
  messageDetail.contentBot = ''

  const modal: any = document.getElementById('modal_message_detail')
  if (modal?.close) modal.close()
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

const fetchChats = async () => {
  loading.value = true
  try {
    const response = await axios.get(`${urlServer}/list-message`, {
      params: {
        page: currentPage.value,
        limit: perPage.value,
        search: searchTerm.value // Truyền searchTerm vào tham số search
      }
    })
    messages.value = response.data.data
    totalItems.value = response.data.total
  } catch (error) {
    console.error('Lỗi khi lấy dữ liệu:', error)
  } finally {
    loading.value = false
  }
}

const debouncedFetch = debounce(() => {
  currentPage.value = 1
  fetchChats()
}, 500)

watch([searchTerm], debouncedFetch)
watch([currentPage, perPage], fetchChats)

onMounted(fetchChats)

const changePerPage = () => {
  currentPage.value = 1
}

const confirmDelete = async (id: string) => {
  const confirmed = confirm('Bạn có chắc chắn muốn xóa người dùng này không?')
  if (!confirmed) return

  try {
    await axios.put(`${urlServer}/delete-bot/${id}`)
    messages.value = messages.value.filter(bot => bot._id !== id)
    toast.success('Xóa thành công tin nhắn!', {
      position: 'top',
      duration: 3000
    });
    if (messages.value.length === 1 && currentPage.value > 1) {
      currentPage.value--
    }
    await fetchChats()
  } catch (error) {
    toast.error('Lỗi xóa bot thất bại!', {
      position: 'top',
      duration: 3000
    });
  }
}
</script>

<template>
  <div class="lg:px-10 pb-10 pt-10 min-h-[calc(100vh-5rem)]">
    <div class="p-4 bg-base-200 shadow">
      <div class="mb-4">
        <input v-model="searchTerm" type="text" class="input search input-bordered w-full max-w-md"
          placeholder="Tìm theo tên người dùng hoặc bot..." />
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
                <th>Tên người dùng</th>
                <th>Tên bot</th>
                <th>Tin nhắn gửi lên</th>
                <th>Tin nhắn trả về</th>
                <th>Đánh giá</th>
                <th>Số tiền đã sử dụng</th>
                <th>Mô hinh</th>
                <th>Ngày tạo</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(message, index) in messages" :key="index">
                <td>{{ (currentPage - 1) * perPage + index + 1 }}</td>
                <td>{{ message.user.name }}</td>
                <td>{{ message.bot.name }}</td>
                <td class="limit-line max-w-48">{{ message.contentUser }}</td>
                <td class="limit-line max-w-48">{{ message.contentBot }}</td>
                <td>
                  <span v-if="message.status === 0">Chưa đánh giá</span>
                  <span v-else-if="message.status === 1">Thích</span>
                  <span v-else-if="message.status === 2">Không thích</span>
                </td>
                <td class="text-center">{{ message.creditCost }}$</td>
                <td>{{ message.models }}</td>
                <td>{{ formatDate(message.createdAt) }}</td>
                <td>
                  <button class="btn btn-ghost btn-xs" @click="getChatDetail(message._id)">
                    <!-- icon giữ nguyên -->
                    <svg xmlns="http://www.w3.org/2000/svg" width="20px" height="20px" viewBox="0 0 512 512">
                      <path fill="currentColor"
                        d="M441 58.9L453.1 71c9.4 9.4 9.4 24.6 0 33.9L424 134.1L377.9 88L407 58.9c9.4-9.4 24.6-9.4 33.9 0zM209.8 256.2L344 121.9l46.1 46.1l-134.3 134.2c-2.9 2.9-6.5 5-10.4 6.1L186.9 325l16.7-58.5c1.1-3.9 3.2-7.5 6.1-10.4zM373.1 25L175.8 222.2c-8.7 8.7-15 19.4-18.3 31.1l-28.6 100c-2.4 8.4-.1 17.4 6.1 23.6s15.2 8.5 23.6 6.1l100-28.6c11.8-3.4 22.5-9.7 31.1-18.3L487 138.9c28.1-28.1 28.1-73.7 0-101.8L474.9 25c-28.1-28.1-73.7-28.1-101.8 0M88 64c-48.6 0-88 39.4-88 88v272c0 48.6 39.4 88 88 88h272c48.6 0 88-39.4 88-88V312c0-13.3-10.7-24-24-24s-24 10.7-24 24v112c0 22.1-17.9 40-40 40H88c-22.1 0-40-17.9-40-40V152c0-22.1 17.9-40 40-40h112c13.3 0 24-10.7 24-24s-10.7-24-24-24z" />
                    </svg>
                  </button>
                  <button class="btn btn-ghost btn-xs" @click="confirmDelete(message._id)">
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

  <dialog id="modal_message_detail" class="modal">
    <div class="modal-box max-w-7xl xl:max-w-[95vw] w-full bg-base-200">
      <button class="btn btn-sm btn-circle btn-ghost absolute right-2 top-2" @click="closeModal">✕</button>
      <section>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label class="label">Tin nhắn người dùng</label>
            <textarea class="textarea textarea-bordered w-full" v-model="messageDetail.contentUser" rows="4" readonly></textarea>
          </div>
          <div>
            <label class="label">Tin nhắn bot</label>
            <textarea class="textarea textarea-bordered w-full" v-model="messageDetail.contentBot" rows="4"
              readonly></textarea>
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
  background-color: #f4f4f4;
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

.dot-more {
  color: white !important;
}

.limit-line {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
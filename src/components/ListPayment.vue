<script setup lang="ts">
import { ref, computed, watch, onMounted, reactive } from 'vue'
import BasePagination from './BasePagination.vue'
import axios from 'axios'
import debounce from 'lodash.debounce'

// Interface dữ liệu người dùng
interface Payment {
  _id: string
  email: string
  value: string,
  createdAt: string,
  status: number
}

// State
const messages = ref<Payment[]>([])
const searchTerm = ref('')
const totalItems = ref(0)
const currentPage = ref(1)
const perPage = ref(10)
const perPageOptions = ref([10, 20, 50, 100])
const loading = ref(false)
const urlServer = import.meta.env.VITE_URL_SERVER

// Pagination handled by BasePagination component

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
    const response = await axios.get(`${urlServer}/list-payment`, {
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
</script>

<template>
  <div class="lg:px-10 pb-10 pt-10 min-h-[calc(100vh-5rem)]">
    <div class="p-4 bg-base-200 shadow">
      <div class="mb-4">
        <input v-model="searchTerm" type="text" class="input search input-bordered w-full max-w-md"
          placeholder="Tìm theo tên người dùng" />
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
                <th>Số tiền</th>
                <th>Ngày tạo</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(message, index) in messages" :key="index">
                <td>{{ (currentPage - 1) * perPage + index + 1 }}</td>
                <td>{{ message.email }}</td>
                <td>{{ message.value }}</td>
                <td>{{ formatDate(message.createdAt) }}</td>
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
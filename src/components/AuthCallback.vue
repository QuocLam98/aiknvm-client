<script setup lang="ts">
import { onMounted, ref } from 'vue';
import axios from 'axios';
import router from '@/router';
const urlServer = import.meta.env.VITE_URL_SERVER
import { useToast } from 'vue-toast-notification';

const toast = useToast()
const isProcessing = ref(true)
const message = ref('Đang xử lý đăng nhập Google…')

onMounted(async () => {
  const code = new URLSearchParams(window.location.search).get('code')
  if (!code) {
    toast.error('Thiếu mã xác thực từ Google. Vui lòng đăng nhập lại.', { position: 'top', duration: 4000 })
    router.push('/login')
    return
  }

  try {
    const res = await axios.post(`${urlServer}/auth/google`, { code })
    const data = res.data || {}

    if (data.status !== 200) {
      toast.error(data.message || 'Đăng nhập thất bại. Vui lòng thử lại.', { position: 'top', duration: 4000 })
      router.push('/login')
      return
    }

    // Thành công
    localStorage.setItem('token', data.token)
    localStorage.setItem('email', data.email)
    router.push('/dashboard')
  } catch (err: any) {
    toast.error('Không thể kết nối máy chủ. Vui lòng thử lại.', { position: 'top', duration: 4000 })
    router.push('/login')
  } finally {
    isProcessing.value = false
  }
})
</script>
<template>
  <div class="p-6 text-center">
    <span v-if="isProcessing">{{ message }}</span>
    <span v-else>Đang chuyển hướng...</span>
  </div>
</template>
<script setup lang="ts">
import { onMounted } from 'vue';
import axios from 'axios';
import router from '@/router';
const urlServer = import.meta.env.VITE_URL_SERVER
import { useToast } from 'vue-toast-notification';


const toast = useToast()
onMounted(async () => {
  const code = new URLSearchParams(window.location.search).get('code')
  if (code) {
    const res = await axios.post(`${urlServer}/auth/google`, { code })

    if (res.data.status === 401) {
      toast.error(res.data.message, {
        position: 'top',
        duration: 3000
      })
      router.push('/login')
      return
    }

    localStorage.setItem('token', res.data.token)
    localStorage.setItem('email', res.data.email)
    router.push('/dashboard')
  }
})
</script>
<template>
  <div class="p-6 text-center">Đang xử lý đăng nhập Google…</div>
</template>
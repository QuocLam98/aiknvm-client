<!-- Verify.vue -->
<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import axios from 'axios'
import '../assets/login.css';
import ZaloHelper from './ZaloHelper.vue';

const router = useRouter()
const route = useRoute()
const message = ref('Đang xác minh...')
const urlServer = import.meta.env.VITE_URL_SERVER
const isVerify = ref(false)

onMounted(async () => {
  const token = route.query.token
  if (typeof token === 'string') {
    const res = await axios.get(`${urlServer}/verify?token=${token}`)
    message.value = res.data.message
    
    if (res.data.status == 200) {
      isVerify.value = true
        setTimeout(() => {
          router.push('/login')
        }, 5000)
      }
  } else {
    message.value = 'Xác thực thất bại'
  }
})
</script>

<template>
  <div class="w-100 h-screen login">
    <h1 class="flex items-center"><img src="/src/assets/logo.png" alt="" class="w-24"> Aiknvm</h1>
    <div class="login-form">
      <div class="login-title">Xác thực email</div>
      <span class="text-center">{{ message }}</span>
      <template v-if="isVerify === true">
          <a href="/login" class="btn btn-outline w-full mt-4">Quay lại đăng nhập</a>
      </template>
    </div>
  </div>
  <ZaloHelper />
</template>

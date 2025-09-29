<!-- SendMail.vue -->
<script setup lang="ts">
import { ref } from 'vue'
import axios from 'axios'
import '../assets/login.css'
import { useToast } from 'vue-toast-notification';
import ZaloHelper from './ZaloHelper.vue';

const toast = useToast()
const email = ref('')
const message = ref('')
const isCooldown = ref(false)
const cooldownTime = ref(60)
let cooldownInterval: ReturnType<typeof setInterval>

const urlServer = import.meta.env.VITE_URL_SERVER

const sendEmail = async () => {
  if (isCooldown.value) return

  try {
    await axios.post(`${urlServer}/sendmail`, { email: email.value })
    message.value = 'Đã gửi email xác thực! Vui lòng kiểm tra hộp thư.'
    startCooldown()
  } catch (error: any) {
    toast.error('Lỗi khi gửi mail!', {
			position: 'top',
			duration: 3000
		});
  }
}

const startCooldown = () => {
  isCooldown.value = true
  cooldownTime.value = 60

  cooldownInterval = setInterval(() => {
    cooldownTime.value--
    if (cooldownTime.value <= 0) {
      clearInterval(cooldownInterval)
      isCooldown.value = false
    }
  }, 1000)
}

</script>

<template>
  <div class="w-100 h-screen login">
    <h1 class="flex items-center"><img src="/src/assets/logo.png" alt="" class="w-24"> AIknvm</h1>
    <div class="login-form">
      <div class="login-title">Xác thực email</div>
      <input v-model="email" type="email" placeholder="Nhập email của bạn"
        class="input sendemail input-bordered w-full" />
      <button type="button" @click="sendEmail" class="btn btn-primary w-full " :disabled="isCooldown">
        <template v-if="isCooldown">
          Nhận lại sau {{ cooldownTime }}s
        </template>
        <template v-else>
          Nhận email
        </template>
      </button>
      <p class="text-sm text-green-600" v-if="message">{{ message }}</p>
    </div>
  </div>
  <ZaloHelper />
</template>

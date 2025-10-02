<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import axios from 'axios';
import '../assets/login.css';
import { useToast } from 'vue-toast-notification';
import ZaloHelper from './ZaloHelper.vue';

const toast = useToast()
const email = ref('');
const password = ref('');
const errorMessage = ref('');
const emailError = ref('');
const passwordError = ref('');
const router = useRouter();
const urlServer = import.meta.env.VITE_URL_SERVER
const urlClient = import.meta.env.VITE_URL_CLIENT
const clientId = import.meta.env.VITE_CLIENT_ID
// Hàm để thay đổi trạng thái của showPassword

const validate = () => {
  emailError.value = '';
  passwordError.value = '';
  let isValid = true;

  if (!email.value) {
    emailError.value = 'Email không được để trống';
    isValid = false;
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value)) {
    emailError.value = 'Email không hợp lệ';
    isValid = false;
  }

  if (!password.value) {
    passwordError.value = 'Mật khẩu không được để trống';
    isValid = false;
  } else if (password.value.length < 6) {
    passwordError.value = 'Mật khẩu phải có ít nhất 6 ký tự';
    isValid = false;
  }

  return isValid;
}

const login = async () => {
  if (!validate()) return
  errorMessage.value = ''
  try {
    const response = await axios.post(`${urlServer}/login`, {
      email: email.value,
      password: password.value,
    })
    if (response.data.status === 404) {
      toast.error(response.data.message, {
        position: 'top',
        duration: 3000
      })
    }
    else if (response.data.data === false) {
      router.push('/sendmail')
    }
    else if (response.data.status === 402) {
      toast.error(response.data.message, {
        position: 'top',
        duration: 3000
      })
    }
    else {
      localStorage.setItem('token', response.data.token)
      localStorage.setItem('email', response.data.email)

      router.push('/dashboard')
    }

  } catch (error: any) {
    toast.error('Sai mặt khẩu hoặc email!', {
      position: 'top',
      duration: 3000
    })
  }
}

const googleLogin = () => {
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: `${urlClient}/auth/callback`,
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'offline',
    prompt: 'consent',
  })

  window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
}

const handleCredentialResponse = async (response: any) => {
  const idToken = response.credential

  // Gửi token về backend để xác thực
  const res = await axios.post(`${urlServer}/auth/google`, {
    idToken: idToken
  })

  if (res.data.status === 200) {
    localStorage.setItem('token', res.data.token)
    localStorage.setItem('email', res.data.email)
    router.push('/dashboard')
  }
}

declare global {
  interface Window {
    google: any;
  }
}

onMounted(async () => {
  const token = localStorage.getItem('token')
  if (!token) {
    router.push('/login') // Chuyển hướng về trang đăng nhập
    return
  }

  try {
    await axios.post(`${urlServer}/verify-tokken`, {
      token: token
    })
    router.push('/dashboard')

  } catch (error) {
    localStorage.clear()
    router.push('/login')
  }
})
</script>

<template>
  <div class="w-100 h-screen login">
    <h1 class="flex items-center text-teal-500"><img src="/src/assets/logo.png" alt="" class="w-18"> Aiknvm</h1>
    <div class="login-form">
      <div class="login-title">Đăng nhập</div>
      <div class="join w-full overflow-hidden" @click="googleLogin()"><button
          class="btn join-item flex-shrink-0 bg-slate-50 hover:bg-slate-50"><svg
            xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" aria-hidden="true" role="img"
            class="icon w-6 h-6"  style="" width="1em" height="1em" viewBox="0 0 128 128"
            data-v-cf1ec82f="">
            <path fill="#fff"
              d="M44.59 4.21a63.28 63.28 0 0 0 4.33 120.9a67.6 67.6 0 0 0 32.36.35a57.13 57.13 0 0 0 25.9-13.46a57.44 57.44 0 0 0 16-26.26a74.3 74.3 0 0 0 1.61-33.58H65.27v24.69h34.47a29.72 29.72 0 0 1-12.66 19.52a36.2 36.2 0 0 1-13.93 5.5a41.3 41.3 0 0 1-15.1 0A37.2 37.2 0 0 1 44 95.74a39.3 39.3 0 0 1-14.5-19.42a38.3 38.3 0 0 1 0-24.63a39.25 39.25 0 0 1 9.18-14.91A37.17 37.17 0 0 1 76.13 27a34.3 34.3 0 0 1 13.64 8q5.83-5.8 11.64-11.63c2-2.09 4.18-4.08 6.15-6.22A61.2 61.2 0 0 0 87.2 4.59a64 64 0 0 0-42.61-.38">
            </path>
            <path fill="#e33629"
              d="M44.59 4.21a64 64 0 0 1 42.61.37a61.2 61.2 0 0 1 20.35 12.62c-2 2.14-4.11 4.14-6.15 6.22Q95.58 29.23 89.77 35a34.3 34.3 0 0 0-13.64-8a37.17 37.17 0 0 0-37.46 9.74a39.25 39.25 0 0 0-9.18 14.91L8.76 35.6A63.53 63.53 0 0 1 44.59 4.21">
            </path>
            <path fill="#f8bd00"
              d="M3.26 51.5a63 63 0 0 1 5.5-15.9l20.73 16.09a38.3 38.3 0 0 0 0 24.63q-10.36 8-20.73 16.08a63.33 63.33 0 0 1-5.5-40.9">
            </path>
            <path fill="#587dbd"
              d="M65.27 52.15h59.52a74.3 74.3 0 0 1-1.61 33.58a57.44 57.44 0 0 1-16 26.26c-6.69-5.22-13.41-10.4-20.1-15.62a29.72 29.72 0 0 0 12.66-19.54H65.27c-.01-8.22 0-16.45 0-24.68">
            </path>
            <path fill="#319f43"
              d="M8.75 92.4q10.37-8 20.73-16.08A39.3 39.3 0 0 0 44 95.74a37.2 37.2 0 0 0 14.08 6.08a41.3 41.3 0 0 0 15.1 0a36.2 36.2 0 0 0 13.93-5.5c6.69 5.22 13.41 10.4 20.1 15.62a57.13 57.13 0 0 1-25.9 13.47a67.6 67.6 0 0 1-32.36-.35a63 63 0 0 1-23-11.59A63.7 63.7 0 0 1 8.75 92.4">
            </path>
          </svg></button><button class="btn join-item flex-shrink w-full justify-start pl-5" >Tiếp tục
          bằng Google</button></div>
      <!-- <div class="flex flex-col gap-2">
        <label>Email</label>
        <input v-model="email" type="email" class="input" placeholder="Nhập email" />
        <p v-if="emailError" class="text-red-500">{{ emailError }}</p>
      </div>

      <div class="flex flex-col gap-2 relative">
        <label>Mật khẩu</label>
        <div class="relative">
          <input v-model="password" :type="showPassword ? 'text' : 'password'" class="input pr-10"
            placeholder="Nhập mật khẩu" />
          <span class="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-gray-500"
            @click="togglePasswordVisibility">
            <div v-html="showPassword ? openEye : closedEye"></div>
          </span>
        </div>
        <p v-if="passwordError" class="text-red-500">{{ passwordError }}</p>
      </div>

      <p v-if="errorMessage" class="text-red-500">{{ errorMessage }}</p>

      <button @click="login" class="btn btn-neutral mt-4">Đăng nhập</button>

      <a href="/register" class="text-red-500">Bạn chưa có tài khoản ? <span class="font-bold red-span">(Hãy nhấn vào
          đây)</span></a>
      <a href="/forgot-password" class="text-red-500">Bạn quên mật khẩu ? <span class="font-bold red-span">(Hãy nhấn vào
          đây)</span></a> -->
    </div>
  </div>
  <ZaloHelper />
</template>
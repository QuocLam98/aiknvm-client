<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import axios from 'axios'
import '../assets/login.css'
import { useToast } from 'vue-toast-notification'
import ZaloHelper from './ZaloHelper.vue'

const toast = useToast()
const password = ref('')
const confirmPassword = ref('')
const token = ref<string | null>(null)
const isSuccess = ref(false) // Trạng thái thành công

const urlServer = import.meta.env.VITE_URL_SERVER

// Lấy token từ URL
onMounted(() => {
  const params = new URLSearchParams(window.location.search)
  token.value = params.get('token')
})

// Kiểm tra điều kiện mật khẩu
const hasUpperCase = computed(() => /[A-Z]/.test(password.value))
const hasSpecialChar = computed(() => /[^A-Za-z0-9]/.test(password.value))
const hasNumberAndLetter = computed(() => /(?=.*[A-Za-z])(?=.*\d)/.test(password.value))
const hasMinLength = computed(() => password.value.length >= 8)

// Kiểm tra xác nhận mật khẩu
const isPasswordMatch = computed(() => password.value === confirmPassword.value)

const allValid = computed(() =>
  hasUpperCase.value &&
  hasSpecialChar.value &&
  hasNumberAndLetter.value &&
  hasMinLength.value &&
  isPasswordMatch.value
)

const resetPassword = async () => {
  if (!allValid.value) {
    toast.error('Vui lòng đảm bảo mật khẩu hợp lệ và trùng khớp!', {
      position: 'top',
      duration: 3000
    })
    return
  }

  try {
    await axios.put(`${urlServer}/updatePassword`, {
      token: token.value,
      password: password.value
    })
    isSuccess.value = true
    toast.success('Mật khẩu đã được thay đổi thành công!', {
      position: 'top',
      duration: 3000
    })
  } catch (error: any) {
    toast.error('Đổi mật khẩu thất bại!', {
      position: 'top',
      duration: 3000
    })
  }
}
</script>


<template>
  <div class="w-100 h-screen login">
    <h1 class="flex items-center"><img src="https://aiknvm.hn.ss.bfcplatform.vn/aiknvm/Asset/logo.png" alt="" class="w-24"> Aiknvm</h1>
    <div class="login-form">
      <div class="login-title">Đặt lại mật khẩu</div>

                <template v-if="!isSuccess">
          <input v-model="password" type="password" placeholder="Mật khẩu mới" class="input input-bordered w-full" />
          <input v-model="confirmPassword" type="password" placeholder="Nhập lại mật khẩu"
            class="input input-bordered w-full" />

          <div class="text-sm mt-2">
            <p :class="hasUpperCase ? 'text-green-600' : 'text-red-500'">• Ít nhất 1 chữ in hoa</p>
            <p :class="hasSpecialChar ? 'text-green-600' : 'text-red-500'">• Ít nhất 1 ký tự đặc biệt</p>
            <p :class="hasNumberAndLetter ? 'text-green-600' : 'text-red-500'">• Có cả chữ và số</p>
            <p :class="hasMinLength ? 'text-green-600' : 'text-red-500'">• Tối thiểu 8 ký tự</p>
            <p :class="isPasswordMatch ? 'text-green-600' : 'text-red-500'">• Mật khẩu trùng khớp</p>
          </div>

          <button @click="resetPassword" class="btn btn-primary w-full mt-4">Xác nhận đổi mật khẩu</button>
        </template>

        <template v-else>
          <p class="text-green-600 text-center font-semibold">✅ Mật khẩu đã đổi thành công!</p>
          <a href="/login" class="btn btn-outline w-full mt-4">Quay lại đăng nhập</a>
        </template>
    </div>
  </div>
  <ZaloHelper />
</template>
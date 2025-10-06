<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useRouter } from 'vue-router';
import axios from 'axios';
import '../assets/login.css';
import { useToast } from 'vue-toast-notification';
import ZaloHelper from './ZaloHelper.vue';

let audio: HTMLAudioElement | null = null
const toast = useToast()
const email = ref('');
const isValidPhone = ref(true)
const phone = ref('')
const password = ref('');
const confirmPassword = ref('');
const errorMessage = ref('');
const emailError = ref('');
const passwordError = ref('');
const confirmPasswordError = ref('');
const router = useRouter();
const urlServer = import.meta.env.VITE_URL_SERVER
const showPassword = ref(false);
const showConfirmPassword = ref(false);
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

const validate = () => {
    emailError.value = '';
    passwordError.value = '';
    confirmPasswordError.value = '';
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
    } else if (!/[A-Z]/.test(password.value)) {
        passwordError.value = 'Mật khẩu phải chứa ít nhất một chữ in hoa';
        isValid = false;
    } else if (!/[!@#$%^&*(),.?":{}|<>]/.test(password.value)) {
        passwordError.value = 'Mật khẩu phải chứa ít nhất một ký tự đặc biệt';
        isValid = false;
    } else if (!/[0-9]/.test(password.value) || !/[a-zA-Z]/.test(password.value)) {
        passwordError.value = 'Mật khẩu phải bao gồm cả chữ và số';
        isValid = false;
    }

    if (password.value !== confirmPassword.value) {
        confirmPasswordError.value = 'Mật khẩu nhập lại không khớp';
        isValid = false;
    }

    return isValid;
}

const register = async () => {
    if (!validate()) return;
    errorMessage.value = '';
    try {
        const response = await axios.post(`${urlServer}/register`, {
            email: email.value,
            password: password.value,
            phone: phone.value
        })
        
        if (response.data.status === 404)
        {
            toast.error(response.data.message, {
            position: 'top',
            duration: 3000
        })
        }
        else {
            toast.success('Đăng ký thành công. Đã gửi mail xác thực đến email của bạn, vui lòng kiểm tra email và xác thực!', {
            position: 'top',
            duration: 10000
        })
        setTimeout(() => {
          router.push('/login');
        }, 5000) // Chuyển hướng đến trang đăng nhập
        }

    } catch (error: any) {
        toast.error('Xin lỗi quý khách, hệ thống đang bị nghẽn. Quý khách làm ơn báo cho chuyên gia kĩ thuật để trợ giúp hoặc reload lại trang!', {
            position: 'top',
            duration: 3000
        })
    }
}

watch(phone, (newVal) => {
  // Regex kiểm tra số điện thoại Việt Nam (10 chữ số, bắt đầu bằng 03, 05, 07, 08, 09)
  const phoneRegex = /^(03|05|07|08|09)\d{8}$/
  isValidPhone.value = phoneRegex.test(newVal)
})
</script>

<template>
    <div class="w-100 h-screen login">
        <h1 class="flex items-center"><img src="https://aiknvm.hn.ss.bfcplatform.vn/aiknvm/Asset/logo.png" alt="" class="w-24"> Aiknvm</h1>
        <div class="login-form">
            <div class="login-title">Đăng ký</div>

            <div class="flex flex-col gap-2">
                <label>Email</label>
                <input v-model="email" type="email" class="input" placeholder="Nhập email" />
                <p v-if="emailError" class="text-red-500">{{ emailError }}</p>
            </div>

            <div class="flex flex-col gap-2">
                <label>Số điện thoại</label>
                <input
                v-model="phone"
                type="text"
                class="input"
                placeholder="Nhập số điện thoại"
                :class="{ 'border-red-500': !isValidPhone && phone }"
                />
                <span v-if="!isValidPhone && phone" class="text-red-500 text-sm">Số điện thoại không hợp lệ</span>
            </div>

            <div class="flex flex-col gap-2 relative">
                <label>Mật khẩu</label>
                <div class="relative">
                    <input v-model="password" :type="showPassword ? 'text' : 'password'" class="input pr-10"
                        placeholder="Nhập mật khẩu" />
                        <span class="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-gray-500"
                        @click="showPassword = !showPassword">
                        <!-- Mắt mở hoặc mắt nhắm -->
                        <svg v-if="showPassword" xmlns="http://www.w3.org/2000/svg" width="20px" height="20px" viewBox="0 0 1200 1200"><path fill="currentColor" d="M779.843 599.925c0 95.331-80.664 172.612-180.169 172.612c-99.504 0-180.168-77.281-180.168-172.612c0-95.332 80.664-172.612 180.168-172.612c99.505-.001 180.169 77.281 180.169 172.612M600 240.521c-103.025.457-209.814 25.538-310.904 73.557C214.038 351.2 140.89 403.574 77.394 468.219C46.208 501.218 6.431 549 0 599.981c.76 44.161 48.13 98.669 77.394 131.763c59.543 62.106 130.786 113.018 211.702 154.179C383.367 931.674 487.712 958.015 600 959.48c103.123-.464 209.888-25.834 310.866-73.557c75.058-37.122 148.243-89.534 211.74-154.179c31.185-32.999 70.962-80.782 77.394-131.763c-.76-44.161-48.13-98.671-77.394-131.764c-59.543-62.106-130.824-112.979-211.74-154.141C816.644 268.36 712.042 242.2 600 240.521m-.076 89.248c156.119 0 282.675 120.994 282.675 270.251S756.043 870.27 599.924 870.27S317.249 749.275 317.249 600.02c0-149.257 126.556-270.251 282.675-270.251"/></svg>
                        <svg v-if="!showPassword" xmlns="http://www.w3.org/2000/svg" width="20px" height="20px" viewBox="0 0 1200 1200"><path fill="currentColor" d="M669.727 273.516c-22.891-2.476-46.15-3.895-69.727-4.248c-103.025.457-209.823 25.517-310.913 73.536c-75.058 37.122-148.173 89.529-211.67 154.174C46.232 529.978 6.431 577.76 0 628.74c.76 44.162 48.153 98.67 77.417 131.764c59.543 62.106 130.754 113.013 211.67 154.174q4.126 2.003 8.276 3.955l-75.072 131.102l102.005 60.286l551.416-960.033l-98.186-60.008zm232.836 65.479l-74.927 129.857c34.47 44.782 54.932 100.006 54.932 159.888c0 149.257-126.522 270.264-282.642 270.264c-6.749 0-13.29-.728-19.922-1.172l-49.585 85.84c22.868 2.449 45.99 4.233 69.58 4.541c103.123-.463 209.861-25.812 310.84-73.535c75.058-37.122 148.246-89.529 211.743-154.174c31.186-32.999 70.985-80.782 77.417-131.764c-.76-44.161-48.153-98.669-77.417-131.763c-59.543-62.106-130.827-113.013-211.743-154.175c-2.731-1.324-5.527-2.515-8.276-3.807m-302.636 19.483c6.846 0 13.638.274 20.361.732l-58.081 100.561c-81.514 16.526-142.676 85.88-142.676 168.897c0 20.854 3.841 40.819 10.913 59.325c.008.021-.008.053 0 .074l-58.228 100.854c-34.551-44.823-54.932-100.229-54.932-160.182c.001-149.255 126.524-270.262 282.643-270.261m168.969 212.035L638.013 797.271c81.076-16.837 141.797-85.875 141.797-168.603c0-20.474-4.086-39.939-10.914-58.155"/></svg>
                    </span>
                </div>
                <p v-if="passwordError" class="text-red-500">{{ passwordError }}</p>
            </div>

            <div class="flex flex-col gap-2 relative">
                <label>Nhập lại mật khẩu</label>
                <div class="relative">
                    <input v-model="confirmPassword" :type="showConfirmPassword ? 'text' : 'password'"
                        class="input pr-10" placeholder="Nhập lại mật khẩu" />
                        <span class="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-gray-500"
                        @click="showConfirmPassword = !showConfirmPassword">
                        <!-- Mắt mở hoặc mắt nhắm -->
                        <svg v-if="showConfirmPassword" xmlns="http://www.w3.org/2000/svg" width="20px" height="20px" viewBox="0 0 1200 1200"><path fill="currentColor" d="M779.843 599.925c0 95.331-80.664 172.612-180.169 172.612c-99.504 0-180.168-77.281-180.168-172.612c0-95.332 80.664-172.612 180.168-172.612c99.505-.001 180.169 77.281 180.169 172.612M600 240.521c-103.025.457-209.814 25.538-310.904 73.557C214.038 351.2 140.89 403.574 77.394 468.219C46.208 501.218 6.431 549 0 599.981c.76 44.161 48.13 98.669 77.394 131.763c59.543 62.106 130.786 113.018 211.702 154.179C383.367 931.674 487.712 958.015 600 959.48c103.123-.464 209.888-25.834 310.866-73.557c75.058-37.122 148.243-89.534 211.74-154.179c31.185-32.999 70.962-80.782 77.394-131.763c-.76-44.161-48.13-98.671-77.394-131.764c-59.543-62.106-130.824-112.979-211.74-154.141C816.644 268.36 712.042 242.2 600 240.521m-.076 89.248c156.119 0 282.675 120.994 282.675 270.251S756.043 870.27 599.924 870.27S317.249 749.275 317.249 600.02c0-149.257 126.556-270.251 282.675-270.251"/></svg>
                        <svg v-if="!showConfirmPassword" xmlns="http://www.w3.org/2000/svg" width="20px" height="20px" viewBox="0 0 1200 1200"><path fill="currentColor" d="M669.727 273.516c-22.891-2.476-46.15-3.895-69.727-4.248c-103.025.457-209.823 25.517-310.913 73.536c-75.058 37.122-148.173 89.529-211.67 154.174C46.232 529.978 6.431 577.76 0 628.74c.76 44.162 48.153 98.67 77.417 131.764c59.543 62.106 130.754 113.013 211.67 154.174q4.126 2.003 8.276 3.955l-75.072 131.102l102.005 60.286l551.416-960.033l-98.186-60.008zm232.836 65.479l-74.927 129.857c34.47 44.782 54.932 100.006 54.932 159.888c0 149.257-126.522 270.264-282.642 270.264c-6.749 0-13.29-.728-19.922-1.172l-49.585 85.84c22.868 2.449 45.99 4.233 69.58 4.541c103.123-.463 209.861-25.812 310.84-73.535c75.058-37.122 148.246-89.529 211.743-154.174c31.186-32.999 70.985-80.782 77.417-131.764c-.76-44.161-48.153-98.669-77.417-131.763c-59.543-62.106-130.827-113.013-211.743-154.175c-2.731-1.324-5.527-2.515-8.276-3.807m-302.636 19.483c6.846 0 13.638.274 20.361.732l-58.081 100.561c-81.514 16.526-142.676 85.88-142.676 168.897c0 20.854 3.841 40.819 10.913 59.325c.008.021-.008.053 0 .074l-58.228 100.854c-34.551-44.823-54.932-100.229-54.932-160.182c.001-149.255 126.524-270.262 282.643-270.261m168.969 212.035L638.013 797.271c81.076-16.837 141.797-85.875 141.797-168.603c0-20.474-4.086-39.939-10.914-58.155"/></svg>
                    </span>
                </div>
                <p v-if="confirmPasswordError" class="text-red-500">{{ confirmPasswordError }}</p>
            </div>
            <div class="text-sm mt-2">
            <p :class="hasUpperCase ? 'text-green-600' : 'text-red-500'">• Ít nhất 1 chữ in hoa</p>
            <p :class="hasSpecialChar ? 'text-green-600' : 'text-red-500'">• Ít nhất 1 ký tự đặc biệt</p>
            <p :class="hasNumberAndLetter ? 'text-green-600' : 'text-red-500'">• Có cả chữ và số</p>
            <p :class="hasMinLength ? 'text-green-600' : 'text-red-500'">• Tối thiểu 8 ký tự</p>
            <p :class="isPasswordMatch ? 'text-green-600' : 'text-red-500'">• Mật khẩu trùng khớp</p>
            </div>

            <p v-if="errorMessage" class="text-red-500">{{ errorMessage }}</p>

            <button @click="register" class="btn btn-neutral mt-4">Đăng ký</button>
            <a href="/login">Bạn đã có tài khoản?</a>
        </div>
    </div>
    <ZaloHelper />
</template>
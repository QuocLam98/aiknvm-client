<script setup lang="ts">
import axios from 'axios';
import { ref, watch, onMounted } from 'vue';
import { useToast } from 'vue-toast-notification';

interface User {
    email: string,
    phone?: string,
    image?: string
}

const avatar = 'https://aiknvm.hn.ss.bfcplatform.vn/aiknvm/Asset/avatar-default.png'
const urlServer = import.meta.env.VITE_URL_SERVER
const user = ref<User | null>(null)
const toast = useToast()
const isValidPhone = ref(true)
const phone = ref('')

const getUser = async (token: any) => {
    const response = await axios.post(`${urlServer}/get-user-detail`, {
        token: token,
    })
    if (response) {
        user.value = response.data
        if (user.value?.phone) {
            phone.value = user.value?.phone
        }
    }

}

watch(phone, (newVal) => {
    // Regex kiểm tra số điện thoại Việt Nam (10 chữ số, bắt đầu bằng 03, 05, 07, 08, 09)
    const phoneRegex = /^(03|05|07|08|09)\d{8}$/
    isValidPhone.value = phoneRegex.test(newVal)
})

onMounted(async () => {
    const token = localStorage.getItem('token')

    getUser(token)
})

const updateUserAcount = async () => {
    if (phone.value === '') {
        toast.error('Nhập số điện thoại', {
            position: 'top',
            duration: 5000
        })
        return
    }
    const token = localStorage.getItem('token')

    const response = await axios.post(`${urlServer}/update-phone`, {
        token: token,
        phone: phone.value
    })

    if (response.data.status === 404) {
        toast.error(response.data.messsage, {
            position: 'top',
            duration: 5000
        })
        return
    }

    toast.success('Cập nhật thông tin thành công', {
        position: 'top',
        duration: 5000
    })
}
</script>

<template>
    <div class="pb-10 min-h-[calc(100vh-5rem)]">
        <div class="pt-10 px-2">
            <div class="card bg-base-100 max-w-lg mx-auto shadow">
                <div class="card-body">
                    <h3 class="card-title text-black">Tài khoản của bạn</h3>
                    <div class="flex justify-center">
                        <div class="avatar">
                            <div class="w-24 rounded-full ring ring-offset-base-100 ring-offset-2"><img
                                    :src="!user?.image ? avatar : user.image">
                            </div>
                        </div>
                    </div>
                    <fieldset class="fieldset">
                        <legend class="fieldset-legend text-black">Email của bạn</legend>
                        <input type="text" :value="user?.email" class="input w-full text-black" placeholder="Type here"
                            readonly disabled>
                    </fieldset>
                    <hr>
                    <fieldset class="fieldset">
                        <legend class="fieldset-legend text-black">Số điện thoại</legend>
                        <input type="text" v-model="phone" class="input w-full text-black" placeholder="Số điện thoại"
                            required>
                    </fieldset>
                    <span v-if="!isValidPhone && phone" class="text-red-500 text-sm">Số điện thoại không hợp
                        lệ</span>
                    <div class="flex justify-end mt-4"><button class="btn btn-accent" @click="updateUserAcount">Lưu
                            lại</button></div>
                </div>
            </div>
        </div>
    </div>
</template>

<style>
input {
    background-color: white !important;
    width: 100% !important;
    border: var(--border) solid #c2bfbf !important;
    color: black !important;
}
</style>
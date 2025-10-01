<script setup lang="ts">
import '../assets/header.css'
import axios from 'axios';
import { ref, onMounted } from 'vue';

const urlServer = import.meta.env.VITE_URL_SERVER
const existLogin = ref(false)
const email = localStorage.getItem('email')

const checkLogin = async () => {
    const token = localStorage.getItem('token')
    if (!token) return
    try {
        await axios.post(`${urlServer}/verify-tokken`, {
        token: token
        })
        existLogin.value = true
    } catch (error) {
        existLogin.value = false
    }
}
onMounted(() => {
    checkLogin()
})
</script>

<template>
    <header id="main-header">
        <div class="container-flur">
            <div class="header-home">
                <div class="header-logo">
                    <a href="/" class="text-5xl text-teal-500 font-bold "><img src="/src/assets/logo.png" alt=""> Aiknvm</a>
                </div>
                <div class="header-button">
                    <ul class="lg-li hidden lg:flex">
                        <!-- <li href="/" class="text-xl">
                            <a href="/">
                                Giới thiệu
                            </a>
                        </li>
                        <li href="/" class="text-xl">
                            <a href="/">
                                Tính năng
                            </a>
                        </li>
                        <li href="/" class="text-xl">
                            <a href="/">
                                Hướng dẫn                                
                            </a>
                        </li> -->
                        <li v-if="existLogin" class="text-black">
                            <a href="/dashboard" v-if="existLogin" class="check-login" style="color: black !important;">Xin chào, {{ email }}</a>
                        </li>
                        <li v-else class="button-login">
                            <a href="/login">
                                ĐĂNG NHẬP
                            </a>
                        </li>
                    </ul>
                    <!-- <div class="dropdown">
                        <div tabindex="0" role="button" class="btn btn-ghost lg:hidden">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24"
                                stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                    d="M4 6h16M4 12h8m-8 6h16" />
                            </svg>
                        </div>
                        <ul tabindex="0"
                            class="menu menu-sm dropdown-content bg-base-100 rounded-box z-1 mt-3 w-52 p-2 shadow">
                            <li><a>Item 1</a></li>
                            <li>
                                <a>Parent</a>
                                <ul class="p-2">
                                    <li><a>Submenu 1</a></li>
                                    <li><a>Submenu 2</a></li>
                                </ul>
                            </li>
                            <li><a>Item 3</a></li>
                        </ul>
                    </div> -->
                </div>

            </div>
        </div>
    </header>
</template>

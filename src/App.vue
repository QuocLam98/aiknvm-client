<script setup lang="ts">
import { RouterView } from 'vue-router'
import { useRoute } from 'vue-router';
import { onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';

const route = useRoute();
const router = useRouter()

onMounted(() => {

  const checkVersion = async () => {
  const version = await fetch(`/version.txt?ts=${Date.now()}`)
    .then(res => res.text())
      
    const lastVersion = localStorage.getItem('version:version')

    if (!lastVersion) {
      localStorage.setItem('version:version', version)
      return
    }

    if (lastVersion !== version) {
      localStorage.setItem('version:version', version)
      location.reload()
    }
  }

  let redirected = false

  // const checkToken = () => {
  //   const token = localStorage.getItem('token')
  //   if (!token && !redirected) {
  //     redirected = true
  //     router.push('/login')
  //   }
  // }

  // Kiểm tra định kỳ mỗi 30s
    const intervalId = setInterval(() => {
    checkVersion()
    // checkToken() // Thêm dòng này để check token mỗi 5s
  }, 5000)

  // Kiểm tra ngay khi quay lại tab
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      checkVersion()
      // checkToken()
    }
  })

  // Kiểm tra lần đầu khi vào
  checkVersion()
  // checkToken()

  onUnmounted(() => {
    clearInterval(intervalId)
  })
})
</script>

<template>
  <RouterView />
</template>

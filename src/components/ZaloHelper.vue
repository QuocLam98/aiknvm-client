<template>
  <div class="zalo-container">
    <!-- BONG BÓNG GIỚI THIỆU -->
    <div v-if="showBubble" class="zalo-bubble">
      <p>
         Bạn có thắc mắc hay cần hỗ trợ chuyên sâu thì quét mã QR sau để được trợ giúp miễn phí.
      </p>
      <button class="close-btn" @click="showBubble = false" aria-label="Đóng bong bóng">×</button>
    </div>

    <!-- ICON ZALO -->
    <a
      href="https://zalo.me/g/fiqwph904"
      target="_blank"
      rel="noopener"
      class="zalo-fixed-icon"
    >
      <img src="https://aiknvm.hn.ss.bfcplatform.vn/aiknvm/Asset/Icon_of_Zalo.svg.webp" alt="Zalo Icon" />
    </a>
  </div>
</template>

<script lang="ts" setup>
import { ref, onMounted } from 'vue'

const showBubble = ref(true)

onMounted(() => {
  // Bong bóng tự đóng sau 7 giây (nếu người dùng không tắt tay)
  setTimeout(() => {
    showBubble.value = false
  }, 5000)
})
</script>

<style scoped>
.zalo-container {
  position: fixed;
  bottom: 20px;
  right: 20px;
  z-index: 9999;
  display: none;
  flex-direction: column;
  align-items: flex-end;
}

/* BONG BÓNG */
.zalo-bubble {
  background-color: #ffffff;
  color: #333;
  border-radius: 12px;
  padding: 14px 16px 14px 16px;
  margin-bottom: 8px;
  max-width: 280px;
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.2);
  position: relative;
  font-size: 14px;
  line-height: 1.5;
}

/* NÚT ĐÓNG */
.close-btn {
  position: absolute;
  top: 6px;
  right: 10px;
  background: transparent;
  border: none;
  font-size: 18px;
  font-weight: bold;
  color: #999;
  cursor: pointer;
  transition: color 0.2s;
}

.close-btn:hover {
  color: #333;
}

/* ICON ZALO */
.zalo-fixed-icon {
  display: block;
  width: 50px;
  height: 50px;
  border-radius: 50%;
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  transition: transform 0.2s;
}

.zalo-fixed-icon img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.zalo-fixed-icon:hover {
  transform: scale(1.1);
}
@media (min-width: 300px) and (max-width: 600px)
{
  .zalo-container {
    bottom: 100px;
  }
}
</style>

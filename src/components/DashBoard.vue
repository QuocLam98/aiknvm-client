<script setup lang="ts">
import { ref, nextTick, onMounted, onUnmounted } from 'vue';
import '../assets/dashboard.css';
import { useRouter } from 'vue-router';
import axios from 'axios';
import { createSWAT } from 'swa-token'
import { useToast } from 'vue-toast-notification';
import QRCode from 'qrcode'
import { eventBus } from '../stores/eventBus';
import { useHistoryChat } from '@/composables/useHistoryChat'
import { useListBot } from '@/composables/useListBot';
import ZaloHelper from './ZaloHelper.vue';


interface User {
  email: string,
  image?: string,
  name: string,
  phone?: string,
}

interface Bot {
  _id: string
  name: string
  createdAt: string
  image: string,
  status: number,
}

// const fields = ref<Field[]>([])
// const selectedFields = ref<string[]>([])
const user = ref<User | null>(null)
const { bots, loadBots } = useListBot()
const botSelect = ref<Bot[]>([])
const { historyChat, loadHistoryChat } = useHistoryChat()
const toast = useToast()
const router = useRouter()
const checkRole = ref(true)
const showModal2 = ref(false)
const showModal3 = ref(false)
const bankName = import.meta.env.VITE_NAME_BANK
const bankAccount = ref('')
const ownerAccount = ref('')
const selectedPrice = ref('')
const paymentNote = ref('')
const qrCodeUrl = ref<string>('')
const urlServer = import.meta.env.VITE_URL_SERVER
const urlClient = import.meta.env.VITE_URL_CLIENT
const getCreditsPayment = ref(0)
const botImage = ref('')
const botImagePremium = ref('')
const closeModal2 = () => {
  showModal2.value = false
}

const closeModal3 = () => {
  showModal3.value = false
}

const getUser = async (token: string) => {
  const response = await axios.post(`${urlServer}/get-user-detail`, {
    token: token
  })
  if (response) {
    user.value = response.data
  }

}

// Nhắc người dùng cập nhật số điện thoại nếu thiếu và điều hướng sang trang hồ sơ
const promptUpdatePhoneIfNeeded = () => {
  try {
    const alreadyPrompted = sessionStorage.getItem('phonePromptShown') === '1'
    const phone = user.value?.phone?.trim() || ''
    if (!alreadyPrompted && phone === '') {
      sessionStorage.setItem('phonePromptShown', '1')
      if (router.currentRoute.value.path !== '/dashboard/profile') {
        router.push('/dashboard/profile')
      }
      toast.warning('Hãy cập nhật số điện thoại của bạn', {
        position: 'top',
        duration: 6000,
      })
    }
  } catch (e) {
    // ignore toast/route issues
  }
}

const goToPayment = async (item: any) => {
  const email = localStorage.getItem('email')
  const responePay = await axios.post(`${urlServer}/pay-ment`, {
    price: Number(item.price.replace(/\./g, '')),
    name: 'Gói ' + item.price,
    amount: Number(item.credits),
    email: email
  })
  getCreditsPayment.value = Number(item.credits)
  ownerAccount.value = responePay.data.accountName
  bankAccount.value = responePay.data.accountNumber
  selectedPrice.value = item.price + " " + item.format
  paymentNote.value = responePay.data.description
  qrCodeUrl.value = await QRCode.toDataURL(responePay.data.qrCode);
  showModal2.value = false
  await nextTick();
  openModal3(responePay.data.checkoutUrl)
}

const goToStoreProducts = () => {
  router.push('/dashboard/store-products')
}

const openModal3 = (checkoutUrl: string) => {
  showModal3.value = true
  const PayOSCheckout = (window as any).PayOSCheckout;
  if (!PayOSCheckout) {
    console.error('PayOSCheckout is not loaded.');
    return;
  }
  const addCredit = async () => {
    const token = localStorage.getItem('token')
    await axios.put(`${urlServer}/add-credit`, {
      amount: getCreditsPayment.value,
      token: token,
      price: selectedPrice.value
    })
    toast.success('Thanh toán thành công', {
      position: 'top',
      duration: 8000
    });
    nextTick(() => {
      closeModal3()
    });
  }
  const config = {
    RETURN_URL: urlClient + '/dashboard',
    ELEMENT_ID: "embeded-payment-container",
    CHECKOUT_URL: checkoutUrl,
    embedded: true,
    onSuccess: (event: any) => {
      if (event.code == "00") {
        addCredit()
      }
      else {
        toast.error('Thanh toán không thành công', {
          position: 'top',
          duration: 8000
        });
      }
    },
  };

  // Đảm bảo gọi sau khi modal hiển thị
  nextTick(() => {
    const { open } = PayOSCheckout.usePayOS(config);
    open();
  });
}


const plans = [
  { price: '50.000', format: 'vnđ', credits: 2, features: ['Hỏi – đáp mọi lĩnh vực như giáo dục, tâm lí, pháp lí, bệnh lí, y học, khoa học, công nghệ, tin học, giới tính, tình yêu, hôn nhân, gia đình.', 'Có thể gõ được 30 câu hỏi với câu trả lời có độ chính xác cao.'] },
  { price: '100.000', format: 'vnđ', credits: 4, features: ['Hỏi được tất cả các lĩnh vực như giáo dục, tâm lí, pháp lí, bệnh lí, y học, khoa học, công nghệ, tin học, giới tính, tình yêu, hôn nhân, gia đình, cách chữa bệnh, hướng dẫn dùng thuốc, viết thơ, viết bài diễn thuyết, bài phát biểu.', 'Có thể hỏi lên tới 100 câu hỏi hay yêu cầu với câu trả lời chuẩn và chất lượng cao, vượt xa các bản miễn phí.'] },
  { price: '150.000', format: 'vnđ', credits: 6, features: ['Hỏi được tất cả các lĩnh vực như giáo dục, tâm lí, pháp lí, bệnh lí, y học, khoa học, công nghệ, tin học, giới tính, tình yêu, hôn nhân, gia đình, cách chữa bệnh, hướng dẫn dùng thuốc, viết thơ, viết bài diễn thuyết, bài phát biểu, kịch bản, viết sách, truyện, tạo tranh ảnh.', 'Có thể hỏi lên tới 150 câu hỏi hay yêu cầu với câu trả lời có độ tin cậy cao, hơn hẳn các bản miễn phí.'] },
  { price: '200.000', format: 'vnđ', credits: 10, features: ['Hỏi được tất cả các lĩnh vực như giáo dục, tâm lí, pháp lí, bệnh lí, y học, khoa học, công nghệ, tin học, giới tính, tình yêu, hôn nhân, gia đình, cách chữa bệnh, hướng dẫn dùng thuốc, viết thơ, viết bài diễn thuyết, bài phát biểu, kịch bản, viết sách, truyện, nghiên cứu khoa học, tìm nguồn tài liệu chính xác, đưa ra ý tưởng, kế hoạch, viết thơ, bài hát, truyện ngắn, kịch bản video, phim tập, tạo nhiều tranh ảnh.', 'Có thể gõ được 200 câu hỏi hay yêu cầu dài với câu trả lời dài, chuẩn và chất lượng cao, vượt xa các bản miễn phí.'] },
]


onMounted(async () => {
  botImage.value = import.meta.env.VITE_CREATE_IMAGE
  botImagePremium.value = import.meta.env.VITE_CREATE_IMAGE_PREMIUM
  const swat = createSWAT(import.meta.env.JWT_SECRET)
  const token = localStorage.getItem('token')
  const script = document.createElement('script')
  script.src = 'https://cdn.payos.vn/payos-checkout/v1/stable/payos-initialize.js'
  script.async = true
  document.body.appendChild(script)
  if (!token) {
    router.push('/login') // Chuyển hướng về trang đăng nhập
    return
  }
  const getDataToken = swat.parse(token)
  try {
    await axios.post(`${urlServer}/verify-tokken`, {
      token: token
    })
    router.push('/dashboard')
    
    if (getDataToken.issuer === 'admin') {
      checkRole.value = true;// Cập nhật giá trị của checkRole thông qua .value
    } else {
      checkRole.value = false
    }

    await loadBots()
    await loadHistoryChat()
    await getUser(token)
    // Sau khi lấy thông tin user, kiểm tra số điện thoại
    promptUpdatePhoneIfNeeded()
    // getListField()
    botSelect.value = bots.value
    eventBus.reloadBots = loadBots;
  } catch (error) {
    localStorage.clear()
    router.push('/login')
  }

  let redirected = false
const checkToken = () => {
  const token = localStorage.getItem('token')
    if (!token && !redirected) {
      redirected = true
      router.push('/login')
    }
}

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      // checkToken()
    }
  })

const intervalId = setInterval(() => {
    checkToken() // Thêm dòng này để check token mỗi 5s
  }, 5000)

  onUnmounted(() => {
    clearInterval(intervalId)
  })
})

const deleteHistory = async (id: string) => {
  try {
    await axios.put(`${urlServer}/delete-chat`, {
      id: id
    })
    loadHistoryChat()
    toast.success('Xóa lịch sử chat thành công!', {
      position: 'top',
      duration: 8000
    })
    router.push('/dashboard/chat')
  } catch (error) {
    toast.error('Lỗi khi xóa lịch sử chat!', {
      position: 'top',
      duration: 8000
    })
  }
}

const logout = () => {
  localStorage.clear() // Xóa token khỏi localStorage
  router.push('/login') // Chuyển hướng về trang đăng nhập
}
// const handleSubmit = () => {
//   const selectedIds = getSelectedFieldIds()
//   if (selectedIds.length > 0) {
//     botSelect.value = []
//     for (const id of selectedIds) {
//       const botFind = bots.value.filter(e => e.field === id)
//       if (botFind.length > 0) {
//         botSelect.value.push(...botFind)
//       }
//     }
//   }

//   showModal4.value = false
// }
// const getSelectedFieldIds = (): string[] => {
//   return selectedFields.value
// }
</script>

<template>
  <div class="drawer lg:drawer-open">
    <input id="my-drawer" type="checkbox" class="drawer-toggle" />
    <div class="drawer-content bg-base-300">
      <!-- Page content here -->
      <div class="navbar bg-base-100 border-b border-base-300">
        <label for="my-drawer" class="btn btn-square btn-ghost btn-hover lg:hidden">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
            <path fill="#000" d="M3 18v-2h18v2zm0-5v-2h18v2zm0-5V6h18v2z" />
          </svg>
        </label>
        <div class="navbar-start">
          <div class="flex items-center font-bold text-5xl text-teal-600 header-dashboard gap-2">
            <img src="https://aiknvm.hn.ss.bfcplatform.vn/aiknvm/Asset/logo.png" alt=""> Aiknvm
          </div>
        </div>
        <div class="navbar-end flex gap-4">
          <button
            v-if="checkRole"
            class="btn btn-outline btn-info"
            @click="goToStoreProducts">
            Kho sản phẩm
          </button>
          <button class="btn btn-pay" @click="showModal2 = true">Nạp tiền</button>
          <button class="btn btn-primary" @click="logout" to="/login">
            <svg xmlns="http://www.w3.org/2000/svg" width="20px" height="20px" viewBox="0 0 24 24">
              <g fill="none" stroke="#fff" stroke-linecap="round" stroke-linejoin="round" stroke-width="2">
                <path stroke-dasharray="36" stroke-dashoffset="36"
                  d="M12 4h-7c-0.55 0 -1 0.45 -1 1v14c0 0.55 0.45 1 1 1h7">
                  <animate fill="freeze" attributeName="stroke-dashoffset" dur="0.5s" values="36;0" />
                </path>
                <path stroke-dasharray="14" stroke-dashoffset="14" d="M9 12h11.5">
                  <animate fill="freeze" attributeName="stroke-dashoffset" begin="0.6s" dur="0.2s" values="14;0" />
                </path>
                <path stroke-dasharray="6" stroke-dashoffset="6" d="M20.5 12l-3.5 -3.5M20.5 12l-3.5 3.5">
                  <animate fill="freeze" attributeName="stroke-dashoffset" begin="0.8s" dur="0.2s" values="6;0" />
                </path>
              </g>
            </svg>
            Đăng xuất
          </button>
        </div>
      </div>
      <router-view></router-view>
    </div>
    <div class="drawer-side border-r border-base-300" id="tab">
      <label for="my-drawer" aria-label="close sidebar" class="drawer-overlay"></label>
      <div class="w-80 bg-white min-h-full">
        <div class="grid place-items-center pt-5">
          <!-- <div class="avatar">
            <div class="w-24 rounded-full ring ring-offset-base-100 ring-offset-2"><img
                :src="!user?.image ? avatar : user.image"></div>
          </div> -->
          <div class="mt-2 text-center">
            <router-link to="/dashboard/profile" class="text-black flex gap-2 btn btn-outline hover:text-white">
              {{ user?.name }}
            </router-link>
            <p class="text-gray-500 text-sm">{{ user?.email }}</p>
          </div>
        </div>
        <ul class="menu bg-base-200 text-base-content p-4">
          <li>
            <router-link class="font-bold" to="/">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
                <path fill="currentColor"
                  d="M19 9.3V4h-3v2.6L12 3L2 12h3v8h5v-6h4v6h5v-8h3zm-9 .7c0-1.1.9-2 2-2s2 .9 2 2z" />
              </svg>
              <summary>
                <span class="font-bold">Trang
                  chủ</span>
              </summary>
            </router-link>
          </li>
          <!-- <li>
            <button class="font-bold" @click="showModal4 = true"><svg xmlns="http://www.w3.org/2000/svg" width="24"
                height="24" viewBox="0 0 2048 2048">
                <path fill="currentColor"
                  d="M256 1408V512h1536v232q-55 8-107 32t-91 63l-569 569zm641 128l-51 52l-19 76H0V256h2048v540q-29-19-61-31t-67-19V384H128v1152zm951-640q42 0 78 15t64 41t42 63t16 79q0 39-15 76t-43 65l-717 717l-377 94l94-377l717-716q29-29 65-43t76-14m51 249q21-21 21-51q0-31-20-50t-52-20q-14 0-27 4t-23 15l-692 692l-34 135l135-34z" />
              </svg>Chọn lĩnh vực</button>
          </li> -->
          <div class="divider my-0"></div>
          <li>
            <router-link class="font-bold" to="/dashboard/chat">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
                <path fill="currentColor"
                  d="M4 18h2v4.081L11.101 18H16c1.103 0 2-.897 2-2V8c0-1.103-.897-2-2-2H4c-1.103 0-2 .897-2 2v8c0 1.103.897 2 2 2" />
                <path fill="currentColor"
                  d="M20 2H8c-1.103 0-2 .897-2 2h12c1.103 0 2 .897 2 2v8c1.103 0 2-.897 2-2V4c0-1.103-.897-2-2-2" />
              </svg>
              <summary>
                <span
                  class="bg-clip-text font-bold bg-gradient-to-l from-primary to-secondary text-transparent">Chat</span>
              </summary>
            </router-link>
          </li>
          <!-- <li>
            <details open class="dropdown">
              <summary><span class="bg-clip-text font-bold flex gap-2 items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" aria-hidden="true"
                    role="img" class="icon text-primary w-6 h-6" width="1em" height="1em" viewBox="0 0 24 24">
                    <g fill="none">
                      <path
                        d="m12.594 23.258l-.012.002l-.071.035l-.02.004l-.014-.004l-.071-.036q-.016-.004-.024.006l-.004.01l-.017.428l.005.02l.01.013l.104.074l.015.004l.012-.004l.104-.074l.012-.016l.004-.017l-.017-.427q-.004-.016-.016-.018m.264-.113l-.014.002l-.184.093l-.01.01l-.003.011l.018.43l.005.012l.008.008l.201.092q.019.005.029-.008l.004-.014l-.034-.614q-.005-.019-.02-.022m-.715.002a.02.02 0 0 0-.027.006l-.006.014l-.034.614q.001.018.017.024l.015-.002l.201-.093l.01-.008l.003-.011l.018-.43l-.003-.012l-.01-.01z">
                      </path>
                      <path fill="currentColor"
                        d="M9.107 5.448c.598-1.75 3.016-1.803 3.725-.159l.06.16l.807 2.36a4 4 0 0 0 2.276 2.411l.217.081l2.36.806c1.75.598 1.803 3.016.16 3.725l-.16.06l-2.36.807a4 4 0 0 0-2.412 2.276l-.081.216l-.806 2.361c-.598 1.75-3.016 1.803-3.724.16l-.062-.16l-.806-2.36a4 4 0 0 0-2.276-2.412l-.216-.081l-2.36-.806c-1.751-.598-1.804-3.016-.16-3.724l.16-.062l2.36-.806A4 4 0 0 0 8.22 8.025l.081-.216zM19 2a1 1 0 0 1 .898.56l.048.117l.35 1.026l1.027.35a1 1 0 0 1 .118 1.845l-.118.048l-1.026.35l-.35 1.027a1 1 0 0 1-1.845.117l-.048-.117l-.35-1.026l-1.027-.35a1 1 0 0 1-.118-1.845l.118-.048l1.026-.35l.35-1.027A1 1 0 0 1 19 2">
                      </path>
                    </g>
                  </svg> Tự đào tạo trợ lý
                </span>
              </summary>
              <ul tabindex="0" class="menu menu-sm gap-1 w-full pr-">
                <li class="w-full">
                  <router-link class="font-bold" to="/dashboard/chatbox/setting"><svg xmlns="http://www.w3.org/2000/svg"
                      width="24" height="24" viewBox="0 0 24 24">
                      <path fill="currentColor"
                        d="m21.51 14.59l-1.25-1.32a7.9 7.9 0 0 0-.06-2.9l1.22-1.32a.76.76 0 0 0 .14-.79a10.3 10.3 0 0 0-2.2-3.35a.74.74 0 0 0-.72-.19l-1.84.47a8.5 8.5 0 0 0-1.83-1l-.45-1.72a.73.73 0 0 0-.59-.55a10 10 0 0 0-1.89-.17a9.4 9.4 0 0 0-2.35.31a.73.73 0 0 0-.53.53l-.48 1.77a8.2 8.2 0 0 0-1.52.88l-1.82-.45a.73.73 0 0 0-.72.21a10 10 0 0 0-2.23 3.62a.76.76 0 0 0 .16.77l1.26 1.31q-.096.631-.1 1.27c0 .3 0 .6.05.9l-1.31 1.46a.75.75 0 0 0-.16.73a10 10 0 0 0 2 3.59a.75.75 0 0 0 .76.24l1.72-.44a8 8 0 0 0 2 1.23l.5 1.79a.77.77 0 0 0 .56.53c.721.163 1.459.247 2.2.25q.886-.01 1.76-.17a.75.75 0 0 0 .59-.53l.47-1.69a8.1 8.1 0 0 0 2.38-1.34l1.76.4a.74.74 0 0 0 .73-.24a10.1 10.1 0 0 0 2-3.34a.76.76 0 0 0-.21-.75m-9.39 1.27a3.81 3.81 0 1 1-.021-7.619a3.81 3.81 0 0 1 .02 7.62" />
                    </svg>
                    <summary style="background-color: unset !important;">
                      <span class="font-bold">Cấu
                        hình câu trả lời</span>
                    </summary>
                  </router-link>
                </li>
                <li class="w-full">
                  <router-link to="/dashboard/chatbox/store" class="w-full">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
                      <path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"
                        stroke-width="2"
                        d="M3 18V6.2c0-1.12 0-1.68.218-2.108c.192-.377.497-.682.874-.874C4.52 3 5.08 3 6.2 3h11.6c1.12 0 1.68 0 2.108.218a2 2 0 0 1 .874.874c.218.427.218.987.218 2.105v11.606c0 .485 0 .865-.018 1.174M3 18c0 .988.013 1.506.218 1.907c.192.377.497.683.874.875c.427.218.987.218 2.105.218h11.607c1.118 0 1.677 0 2.104-.218c.376-.192.682-.498.874-.875c.123-.242.177-.526.2-.93M3 18l4.768-5.562l.001-.002c.423-.493.635-.74.886-.83a1 1 0 0 1 .681.005c.25.093.46.343.876.843l2.671 3.205c.386.464.58.696.816.79a1 1 0 0 0 .651.028c.244-.072.46-.287.889-.716l.497-.497c.437-.438.656-.656.904-.728a1 1 0 0 1 .659.037c.238.099.431.34.818.822l2.865 3.582m0 0L21 19M15 9a1 1 0 1 1 0-2a1 1 0 0 1 0 2" />
                    </svg><span class="font-bold">Tải ảnh và tài liệu</span>
                  </router-link>
                </li>
              </ul>
            </details>
          </li> -->
          <li>
            <router-link class="font-bold w-full" to="/dashboard/payment">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
                <path fill="currentColor" fill-rule="evenodd"
                  d="M7.245 2h9.51c1.159 0 1.738 0 2.206.163a3.05 3.05 0 0 1 1.881 1.936C21 4.581 21 5.177 21 6.37v14.004c0 .858-.985 1.314-1.608.744a.946.946 0 0 0-1.284 0l-.483.442a1.657 1.657 0 0 1-2.25 0a1.657 1.657 0 0 0-2.25 0a1.657 1.657 0 0 1-2.25 0a1.657 1.657 0 0 0-2.25 0a1.657 1.657 0 0 1-2.25 0l-.483-.442a.946.946 0 0 0-1.284 0c-.623.57-1.608.114-1.608-.744V6.37c0-1.193 0-1.79.158-2.27c.3-.913.995-1.629 1.881-1.937C5.507 2 6.086 2 7.245 2M7 6.75a.75.75 0 0 0 0 1.5h.5a.75.75 0 0 0 0-1.5zm3.5 0a.75.75 0 0 0 0 1.5H17a.75.75 0 0 0 0-1.5zM7 10.25a.75.75 0 0 0 0 1.5h.5a.75.75 0 0 0 0-1.5zm3.5 0a.75.75 0 0 0 0 1.5H17a.75.75 0 0 0 0-1.5zM7 13.75a.75.75 0 0 0 0 1.5h.5a.75.75 0 0 0 0-1.5zm3.5 0a.75.75 0 0 0 0 1.5H17a.75.75 0 0 0 0-1.5z"
                  clip-rule="evenodd" />
              </svg>
              <summary style="background-color: unset !important;">
                <span class="font-bold">Thanh
                  toán và sử dụng</span>
              </summary>
            </router-link>
          </li>
          <div class="divider my-0" v-if="checkRole"></div>
          <li v-if="checkRole">
            <details class="dropdown">
              <summary>
                <span
                  class="bg-clip-text font-bold bg-gradient-to-l from-primary to-secondary text-transparent flex gap-2 items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24">
                    <path fill="#000"
                      d="M12 23C6.443 21.765 2 16.522 2 11V5l10-4l10 4v6c0 5.524-4.443 10.765-10 12M4 6v5a10.58 10.58 0 0 0 8 10a10.58 10.58 0 0 0 8-10V6l-8-3Z" />
                    <circle cx="12" cy="8.5" r="2.5" fill="#000" />
                    <path fill="#000"
                      d="M7 15a5.78 5.78 0 0 0 5 3a5.78 5.78 0 0 0 5-3c-.025-1.896-3.342-3-5-3c-1.667 0-4.975 1.104-5 3" />
                  </svg>
                  Danh sách cho Admin
                </span>
              </summary>
              <ul
                class="menu bot-scroll gap-1 w-full pr-4 max-h-[400px] overflow-y-auto overflow-x-hidden whitespace-normal">
                <li>
                  <router-link to="/dashboard/list-user">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
                      <circle cx="12" cy="6" r="4" fill="currentColor" />
                      <path fill="currentColor"
                        d="M20 17.5c0 2.485 0 4.5-8 4.5s-8-2.015-8-4.5S7.582 13 12 13s8 2.015 8 4.5" />
                    </svg>
                    [Admin] Quản lý tài khoản
                  </router-link>
                </li>
                <li>
                  <router-link to="/dashboard/list-bot">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 28 28">
                      <path fill="currentColor"
                        d="M14 1.5a.75.75 0 0 1 .75.75V3h4.5A2.75 2.75 0 0 1 22 5.75v5.5A2.75 2.75 0 0 1 19.25 14H8.75A2.75 2.75 0 0 1 6 11.25v-5.5A2.75 2.75 0 0 1 8.75 3h4.5v-.75A.75.75 0 0 1 14 1.5M6.75 16A2.75 2.75 0 0 0 4 18.75v.75c0 1.977.961 3.642 2.717 4.78C8.444 25.397 10.917 26 14 26s5.556-.602 7.283-1.72C23.039 23.141 24 21.476 24 19.5v-.75A2.75 2.75 0 0 0 21.25 16zM11 10a1.5 1.5 0 1 0 0-3a1.5 1.5 0 0 0 0 3m7.5-1.5a1.5 1.5 0 1 0-3 0a1.5 1.5 0 0 0 3 0" />
                    </svg>
                    [Admin] Quản lý bot AI
                  </router-link>
                </li>
                <li>
                  <router-link to="/dashboard/list-chat">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
                      <g fill="currentColor" fill-opacity="0" stroke="currentColor" stroke-linecap="round"
                        stroke-linejoin="round" stroke-width="1">
                        <path stroke-dasharray="12" stroke-dashoffset="12"
                          d="M3.5 5c0 -0.83 0.67 -1.5 1.5 -1.5c0.83 0 1.5 0.67 1.5 1.5c0 0.83 -0.67 1.5 -1.5 1.5c-0.83 0 -1.5 -0.67 -1.5 -1.5Z">
                          <animate fill="freeze" attributeName="fill-opacity" begin="1.7s" dur="0.5s" values="0;1" />
                          <animate fill="freeze" attributeName="stroke-dashoffset" dur="0.2s" values="12;0" />
                        </path>
                        <path stroke-dasharray="12" stroke-dashoffset="12"
                          d="M3.5 12c0 -0.83 0.67 -1.5 1.5 -1.5c0.83 0 1.5 0.67 1.5 1.5c0 0.83 -0.67 1.5 -1.5 1.5c-0.83 0 -1.5 -0.67 -1.5 -1.5Z">
                          <animate fill="freeze" attributeName="fill-opacity" begin="2.3s" dur="0.5s" values="0;1" />
                          <animate fill="freeze" attributeName="stroke-dashoffset" begin="0.6s" dur="0.2s"
                            values="12;0" />
                        </path>
                        <path stroke-dasharray="12" stroke-dashoffset="12"
                          d="M3.5 19c0 -0.83 0.67 -1.5 1.5 -1.5c0.83 0 1.5 0.67 1.5 1.5c0 0.83 -0.67 1.5 -1.5 1.5c-0.83 0 -1.5 -0.67 -1.5 -1.5Z">
                          <animate fill="freeze" attributeName="fill-opacity" begin="2.9s" dur="0.5s" values="0;1" />
                          <animate fill="freeze" attributeName="stroke-dashoffset" begin="1.2s" dur="0.2s"
                            values="12;0" />
                        </path>
                        <path stroke-dasharray="28" stroke-dashoffset="28"
                          d="M9.5 5c0 -0.83 0.67 -1.5 1.5 -1.5h8c0.83 0 1.5 0.67 1.5 1.5c0 0.83 -0.67 1.5 -1.5 1.5h-8c-0.83 0 -1.5 -0.67 -1.5 -1.5Z">
                          <animate fill="freeze" attributeName="fill-opacity" begin="1.9s" dur="0.5s" values="0;1" />
                          <animate fill="freeze" attributeName="stroke-dashoffset" begin="0.2s" dur="0.4s"
                            values="28;0" />
                        </path>
                        <path stroke-dasharray="28" stroke-dashoffset="28"
                          d="M9.5 12c0 -0.83 0.67 -1.5 1.5 -1.5h8c0.83 0 1.5 0.67 1.5 1.5c0 0.83 -0.67 1.5 -1.5 1.5h-8c-0.83 0 -1.5 -0.67 -1.5 -1.5Z">
                          <animate fill="freeze" attributeName="fill-opacity" begin="2.5s" dur="0.5s" values="0;1" />
                          <animate fill="freeze" attributeName="stroke-dashoffset" begin="0.8s" dur="0.4s"
                            values="28;0" />
                        </path>
                        <path stroke-dasharray="28" stroke-dashoffset="28"
                          d="M9.5 19c0 -0.83 0.67 -1.5 1.5 -1.5h8c0.83 0 1.5 0.67 1.5 1.5c0 0.83 -0.67 1.5 -1.5 1.5h-8c-0.83 0 -1.5 -0.67 -1.5 -1.5Z">
                          <animate fill="freeze" attributeName="fill-opacity" begin="3.1s" dur="0.5s" values="0;1" />
                          <animate fill="freeze" attributeName="stroke-dashoffset" begin="1.4s" dur="0.4s"
                            values="28;0" />
                        </path>
                      </g>
                    </svg>
                    [Admin] Quản lý tin nhắn
                  </router-link>
                </li>
                <li>
                  <router-link to="/dashboard/list-payment">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 16 16">
                      <path fill="currentColor"
                        d="M3.5 3A2.5 2.5 0 0 0 1 5.5V6h14v-.5A2.5 2.5 0 0 0 12.5 3zM15 7H1v3.5A2.5 2.5 0 0 0 3.5 13h9a2.5 2.5 0 0 0 2.5-2.5zm-4.5 3h2a.5.5 0 0 1 0 1h-2a.5.5 0 0 1 0-1" />
                    </svg>
                    [Admin] Quản lý thanh toán
                  </router-link>
                </li>
                <!-- <li>
                  <router-link to="/dashboard/list-field">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 2048 2048">
                      <path fill="currentColor"
                        d="M256 1408V512h1536v232q-55 8-107 32t-91 63l-569 569zm641 128l-51 52l-19 76H0V256h2048v540q-29-19-61-31t-67-19V384H128v1152zm951-640q42 0 78 15t64 41t42 63t16 79q0 39-15 76t-43 65l-717 717l-377 94l94-377l717-716q29-29 65-43t76-14m51 249q21-21 21-51q0-31-20-50t-52-20q-14 0-27 4t-23 15l-692 692l-34 135l135-34z" />
                    </svg>
                    [Admin] Quản lý lĩnh vực
                  </router-link>
                </li> -->
                <li>
                  <router-link to="/dashboard/list-products">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
                      <path fill="currentColor"
                        d="M16.503 4.5v-1h-2v2H4.501v-2h-2v1H1.5v18.005h1v1h13.003v-1h-1v-1h1v-1h-1v-2.001h1v-1h-1v-1h1v-1h1v-1.001h1V4.501zm-4 14.004H8.502v-2h4zm0 3H3.5v-1h9.003zM3.5 8.503h1v1h1v-1h1.001v-1h1v1h-1v1h-1v1h-1v-1h-1zm0 4h1v1h1v-1h1.001v-1h1v1h-1v1h-1v1.001h-1v-1h-1zm1 4.001v1h1v-1h1.001v-1h1v1h-1v1h-1v1h-1v-1h-1v-1zm11.003-3h-1v1H8.502v-2h7.001zm0-3H8.502V8.501h7.001z" />
                      <path fill="currentColor"
                        d="M23.505 17.503v-1h-1v-1h-1v1h-1v-1h-2.001v1h-1v-1h-1v1h-1v1h1v1h-1v2.001h1v1h-1v1h1v1h1v-1h1v1h2v-1h1v1h1v-1h1.001v-1h-1v-1h1v-2h-1v-1zm-3 3.001h-2.001v-2h2zM13.503 2.5v2H5.5v-2h1v-1h6.001v1z" />
                    </svg>
                    [Admin] Quản lý sản phẩm bán ra
                  </router-link>
                </li>
              </ul>
            </details>
          </li>
          <div class="divider my-0"></div>
          <li>
            <details class="dropdown">
              <summary>
                <span
                  class="bg-clip-text font-bold bg-gradient-to-l from-primary to-secondary text-transparent flex gap-2 items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 48 48">
                    <path fill="#000"
                      d="M24 4c.69 0 1.25.56 1.25 1.25V7h7.5A4.25 4.25 0 0 1 37 11.25v8.15a3 3 0 0 0-1.55-.4a3 3 0 0 0-1.75.56A3 3 0 0 0 32.59 21v.07l-.85 2.6a3 3 0 0 1-.122.33H15.25A4.25 4.25 0 0 1 11 19.75v-8.5A4.25 4.25 0 0 1 15.25 7h7.5V5.25c0-.69.56-1.25 1.25-1.25m1.41 24H12.25A4.25 4.25 0 0 0 8 32.25v1.05c0 3.154 1.535 5.888 4.336 7.785C15.1 42.957 19.06 44 24 44s8.9-1.043 11.664-2.915q.764-.518 1.4-1.115H35.65l-.135.003a3 3 0 0 1-1.735-.553a3 3 0 0 1-1.12-1.51l-.84-2.59a3.2 3.2 0 0 0-.54-1A3 3 0 0 0 31 34a3.3 3.3 0 0 0-1.35-.79L27 32.35A3 3 0 0 1 25.41 28M16.5 15.5a2.5 2.5 0 1 0 5 0a2.5 2.5 0 0 0-5 0M29 18a2.5 2.5 0 1 0 0-5a2.5 2.5 0 0 0 0 5m3.833 15.112a5.36 5.36 0 0 0-2.544-1.805l-2.603-.845a1.028 1.028 0 0 1 0-1.937l2.602-.845a5.36 5.36 0 0 0 3.323-3.33l.022-.064l.845-2.6a1.027 1.027 0 0 1 1.94 0l.845 2.6a5.36 5.36 0 0 0 3.397 3.394l2.602.845l.052.013a1.028 1.028 0 0 1 0 1.937l-2.602.845a5.36 5.36 0 0 0-3.397 3.394l-.846 2.6l-.025.064a1.027 1.027 0 0 1-1.538.433a1.03 1.03 0 0 1-.375-.496l-.846-2.601a5.4 5.4 0 0 0-.852-1.602m14.776 6.872l-1.378-.448a2.84 2.84 0 0 1-1.797-1.796l-.448-1.377a.544.544 0 0 0-1.027 0l-.448 1.377a2.84 2.84 0 0 1-1.77 1.796l-1.378.448a.545.545 0 0 0 0 1.025l1.378.448q.227.075.438.188l.003.015a2.84 2.84 0 0 1 1.357 1.61l.448 1.377a.545.545 0 0 0 1.01.038v-.008l.016-.04l.448-1.377a2.84 2.84 0 0 1 1.798-1.796l1.378-.448a.545.545 0 0 0 0-1.025z" />
                  </svg>
                  Danh sách trợ lý AI
                </span>
              </summary>
              <ul
                class="menu bot-scroll gap-1 w-full pr-4 max-h-[400px] overflow-y-auto overflow-x-hidden whitespace-normal">
                <!-- CHỈ lặp ở đây -->
                <!-- Nếu bot._id === botImage thì không có @click, dùng router-link -->
                <!-- <li v-if="botSelect.length == 0">
                  <span class="font-bold">Bạn hãy chọn lĩnh vực để hiển thị các trợ lý</span>
                </li> -->
                <li v-for="bot in bots" :key="bot._id" class="w-full">
                  <router-link v-if="bot._id === botImage" to='/dashboard/chat-image' custom
                    v-slot="{ href, navigate }">
                    <a :href="href" @click="navigate"
                      :class="['w-full font-bold flex items-center gap-2 min-w-0', bot.status == 1 ? 'disabled-a' : '']">
                      <div class="avatar flex-shrink-0">
                        <div class="w-8 h-8 rounded-full overflow-hidden">
                          <img :src="bot.image" alt="Bot avatar" class="w-full h-full object-cover" />
                        </div>
                      </div>
                      <span class="max-w-[calc(100%-40px)]">{{ bot.status == 1 ? bot.name + ' {Đang bảo trì}' : bot.name
                      }}</span>
                    </a>
                  </router-link>
                  <router-link v-else-if="bot._id === botImagePremium" to='/dashboard/chat-image-pre' custom
                    v-slot="{ href, navigate }">
                    <a :href="href" @click="navigate" class="w-full font-bold flex items-center gap-2 min-w-0">
                      <div class="avatar flex-shrink-0">
                        <div class="w-8 h-8 rounded-full overflow-hidden">
                          <img :src="bot.image" alt="Bot avatar" class="w-full h-full object-cover" />
                        </div>
                      </div>
                      <span class="max-w-[calc(100%-40px)]">{{ bot.name }}</span>
                    </a>
                  </router-link>
                  <!-- Ngược lại: có @click -->
                  <router-link v-else :to="{ path: '/dashboard/chat-bot', query: { code: bot._id } }" custom
                    v-slot="{ href, navigate }">
                    <a :href="href" @click="navigate"
                      :class="['w-full font-bold flex items-center gap-2 min-w-0', bot.status == 1 ? 'disabled-a' : '']">
                      <div class="avatar flex-shrink-0">
                        <div class="w-8 h-8 rounded-full overflow-hidden">
                          <img :src="bot.image" alt="Bot avatar" class="w-full h-full object-cover" />
                        </div>
                      </div>
                      <span class="max-w-[calc(100%-40px)]">{{ bot.status == 1 ? bot.name + ' {Đang bảo trì}' : bot.name
                      }}</span>
                    </a>
                  </router-link>
                </li>
              </ul>
            </details>
          </li>
          <li>
            <details class="dropdown">
              <summary>
                <span
                  class="bg-clip-text font-bold bg-gradient-to-l from-primary to-secondary text-transparent flex gap-2 items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 20 20">
                    <path fill="#000"
                      d="M10 2a8 8 0 1 1-3.613 15.14l-.121-.065l-3.645.91a.5.5 0 0 1-.62-.441v-.082l.014-.083l.91-3.644l-.063-.12a8 8 0 0 1-.83-2.887l-.025-.382L2 10q.001-.823.16-1.599V8.4a.506.506 0 0 1 .615-.394c.307.08.413.394.353.671l-.012.049a7.04 7.04 0 0 0 .778 4.7a.5.5 0 0 1 .063.272l-.014.094l-.756 3.021l3.024-.754a.5.5 0 0 1 .188-.01l.091.021l.087.039A7 7 0 1 0 4.255 6H6.5a.5.5 0 0 1 0 1h-3a.5.5 0 0 1-.5-.5v-3a.5.5 0 0 1 1 0v1.208A7.98 7.98 0 0 1 10 2M4.341 8A6 6 0 0 0 4 9.98l.006.279l.02.311a6 6 0 0 0 .612 2.126l.413.78l-.49 1.963l1.967-.49l.78.415a6 6 0 1 0-.64-10.355A1.5 1.5 0 0 1 6.5 8zM10 7.5V11h2.5a.5.5 0 0 1 0 1h-3a.5.5 0 0 1-.5-.5v-4a.5.5 0 0 1 1 0" />
                  </svg>
                  Danh sách lịch sử tin nhắn
                </span>
              </summary>
              <ul tabindex="0"
                class="menu bot-scroll gap-1 w-full pr-4 max-h-[400px] overflow-y-auto overflow-x-hidden whitespace-normal">
                <li v-for="history in historyChat" :key="history._id" class="w-full">
                  <router-link v-if="history.bot === botImage"
                    :to="{ path: '/dashboard/chat-image-history', query: { code: history._id } }" custom
                    v-slot="{ href, navigate }">
                    <div class="flex items-center justify-between disabled-a">
                      <a :href="href" @click="navigate" class="w-full flex items-center justify-between gap-2 min-w-0">
                        <span class="limit-line" style="width: 228px;">{{ history.name }}</span>
                      </a>
                      <button class="cursor-pointer" @click="deleteHistory(history._id)">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
                          <path fill="#000"
                            d="M7 21q-.825 0-1.412-.587T5 19V6H4V4h5V3h6v1h5v2h-1v13q0 .825-.587 1.413T17 21zm2-4h2V8H9zm4 0h2V8h-2z" />
                        </svg>
                      </button>
                    </div>
                  </router-link>
                  <router-link v-else-if="history.bot === botImagePremium"
                    :to="{ path: '/dashboard/chat-image-history-pre', query: { code: history._id } }" custom
                    v-slot="{ href, navigate }">
                    <div class="flex items-center justify-between">
                      <a :href="href" @click="navigate" class="w-full flex items-center justify-between gap-2 min-w-0">
                        <span class="limit-line" style="width: 228px;">{{ history.name }}</span>
                      </a>
                      <button class="cursor-pointer" @click="deleteHistory(history._id)">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
                          <path fill="#000"
                            d="M7 21q-.825 0-1.412-.587T5 19V6H4V4h5V3h6v1h5v2h-1v13q0 .825-.587 1.413T17 21zm2-4h2V8H9zm4 0h2V8h-2z" />
                        </svg>
                      </button>
                    </div>
                  </router-link>
                  <!-- Ngược lại: có @click -->
                  <router-link v-else :to="{ path: '/dashboard/chat-history', query: { code: history._id } }" custom
                    v-slot="{ href, navigate }"
                    :class="[(history._id === '6801bed728dffd6f38be3387' || history._id === '680a597612a482414402ec62') ? 'disabled-a' : '']">
                    <div class="flex items-center justify-between">
                      <a :href="href" @click="navigate" class="w-full justify-between flex items-center gap-2 min-w-0">
                        <span class="limit-line" style="width: 228px;">{{ history.name }}</span>
                      </a>
                      <button class="cursor-pointer" @click="deleteHistory(history._id)">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
                          <path fill="#000"
                            d="M7 21q-.825 0-1.412-.587T5 19V6H4V4h5V3h6v1h5v2h-1v13q0 .825-.587 1.413T17 21zm2-4h2V8H9zm4 0h2V8h-2z" />
                        </svg>
                      </button>
                    </div>
                  </router-link>
                </li>
              </ul>
            </details>
          </li>
        </ul>
      </div>
    </div>
  </div>
  <div>
    <!-- Modal 2 -->
    <Transition name="fade">
      <dialog v-if="showModal2" id="my_modal_2" class="modal" open>
        <div class="modal-box max-w-7xl xl:max-w-[95vw] w-full [&>button.absolute]:z-10 bg-base-200">
          <button @click="closeModal2" class="btn btn-sm btn-circle btn-ghost absolute right-2 top-2 close-btn"><svg
              xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
              <g fill="none" stroke="#000" stroke-linecap="round" stroke-linejoin="round" stroke-width="2">
                <path stroke-dasharray="64" stroke-dashoffset="64"
                  d="M12 3c4.97 0 9 4.03 9 9c0 4.97 -4.03 9 -9 9c-4.97 0 -9 -4.03 -9 -9c0 -4.97 4.03 -9 9 -9Z">
                  <animate fill="freeze" attributeName="stroke-dashoffset" dur="0.6s" values="64;0" />
                </path>
                <path stroke-dasharray="8" stroke-dashoffset="8" d="M12 12l4 4M12 12l-4 -4M12 12l-4 4M12 12l4 -4">
                  <animate fill="freeze" attributeName="stroke-dashoffset" begin="0.6s" dur="0.2s" values="8;0" />
                </path>
              </g>
            </svg></button>
          <section class="">
            <!-- Nội dung bảng giá -->
            <div class="grid gap-3 lg:grid-cols-4 sm:grid-cols-2">
              <div v-for="(item, index) in plans" :key="index"
                class="card shadow bg-base-100 hover:shadow-lg transition-all duration-300">
                <div class="card-body text-center px-3">
                  <h3 class="card-title block">{{ item.price }} {{ item.format }}</h3>
                  <ul class="text-left h-96">
                    <li v-for="(feature, idx) in item.features" :key="idx" class="flex space-x-3">
                      <span>✔</span>
                      <span>{{ feature }}</span>
                    </li>
                  </ul>
                  <button @click="goToPayment(item)" class="btn btn-primary mt-5">Mua ngay</button>
                </div>
              </div>
            </div>
            <div class="text-center mt-5">(*) 1 credits = 1 USD</div>
          </section>
        </div>
      </dialog>
    </Transition>

    <!-- Modal 3 -->
    <Transition name="fade">
      <dialog v-if="showModal3" id="my_modal_3" class="modal" open>
        <div class="modal-box max-w-7xl xl:max-w-[95vw] w-full [&>button.absolute]:z-10 bg-base-200">
          <button @click="closeModal3" class="btn btn-sm btn-circle btn-ghost absolute right-2 top-2 close-btn"><svg
              xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
              <g fill="none" stroke="#000" stroke-linecap="round" stroke-linejoin="round" stroke-width="2">
                <path stroke-dasharray="64" stroke-dashoffset="64"
                  d="M12 3c4.97 0 9 4.03 9 9c0 4.97 -4.03 9 -9 9c-4.97 0 -9 -4.03 -9 -9c0 -4.97 4.03 -9 9 -9Z">
                  <animate fill="freeze" attributeName="stroke-dashoffset" dur="0.6s" values="64;0" />
                </path>
                <path stroke-dasharray="8" stroke-dashoffset="8" d="M12 12l4 4M12 12l-4 -4M12 12l-4 4M12 12l4 -4">
                  <animate fill="freeze" attributeName="stroke-dashoffset" begin="0.6s" dur="0.2s" values="8;0" />
                </path>
              </g>
            </svg></button>
          <section class="">
            <div class="px-3">
              <div class="text-center my-5">
                <h2 class="section-title">Thanh toán</h2>
              </div>
              <div class="grid gap-5 md:grid-cols-2">
                <div class="bg-white rounded w-full p-5 shadow-lg">
                  <div id="embeded-payment-container" style="height: 400px"></div>
                </div>
                <div class="md:order-first flex flex-col space-y-5">
                  <div class="p-5 bg-white rounded shadow">
                    <ul class="text-lg">
                      <li><strong>{{ bankName }}</strong></li>
                      <li>Số tài khoản: <span class="text-info font-mono tracking-wider">{{ bankAccount }}</span></li>
                      <li>Chủ tài khoản: <strong class="text-info">{{ ownerAccount }}</strong></li>
                    </ul>
                  </div>
                  <div class="p-5 bg-white rounded text-center h-full shadow">
                    <p class="text-xl">Chuyển khoản: <span class="text-info font-mono">{{ selectedPrice }}</span></p>
                    <p class="text-xl">Nội dung: <span class="text-info">{{ paymentNote }}</span></p>
                    <div class="divider"></div>
                    <p class="opacity-70">
                      Tài khoản của bạn sẽ nhận được credit ngay khi chúng tôi nhận được chuyển khoản
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </dialog>
    </Transition>
  </div>
  <ZaloHelper />
</template>

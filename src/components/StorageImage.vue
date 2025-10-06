<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import axios from 'axios';
import { useToast } from 'vue-toast-notification';
import { useRouter } from 'vue-router';

interface Bot {
	_id: string;
	name: string;
	templateMessage?: string; // Cho phép templateMessage là string hoặc undefined
}

interface SelectedFile extends File {
  _id: string
  url?: string
	typeFile: string
	name: string
}

const router = useRouter()
const toast = useToast();
const maxLength = 15500;
const text = ref('');
const charCount = computed(() => `${text.value.length}/${maxLength}`);

const bots = ref<Bot[]>([]);
const selectedBotId = ref<string>(''); // Khởi tạo rỗng
const urlServer = import.meta.env.VITE_URL_SERVER
const selectedFile = ref<{ previewUrl: string; file: File } | null>(null);
const fileInput = ref<HTMLInputElement>()
const selectedFiles = ref<SelectedFile[]>([])

const getBot = async () => {
	const token = localStorage.getItem('token');
	if (!token) 
	{
		router.push('/login')
    localStorage.clear()
		return;
	}

	// Gọi API lấy list-bot-admin
	try {
		const response = await axios.get(`${urlServer}/list-bot-chat`);
		const getListBot = response.data

		const botImage = import.meta.env.VITE_CREATE_IMAGE
		const botImagePremium = import.meta.env.VITE_CREATE_IMAGE_PREMIUM
		bots.value = Array.isArray(getListBot)
			? getListBot.filter((bot: { _id: string }) => bot._id !== botImage && bot._id !== botImagePremium)
			: []
	} catch (error) {
		toast.error('Lỗi khi lấy danh sách bot!', {
			position: 'top',
			duration: 3000
		})
	}
}

onMounted(async () => {
	await getBot()
})

// const addTemplate = async () => {

// 	const token = localStorage.getItem('token');
// 	if (!selectedBotId.value) return alert('Vui lòng chọn một Bot!');

// 	// Tìm bản ghi useBot theo bot._id
// 	const existingUseBot = useBotDataRaw.value.find(u => u.bot._id === selectedBotId.value);
// 	try {
// 		if (existingUseBot && existingUseBot._id) {
// 			// Nếu đã tồn tại bản ghi => cập nhật
// 			await axios.put(`${urlServer}/update-use-bot/` + existingUseBot._id, {
// 				templateMessage: text.value,
// 			});
// 			await getBot()
// 			toast.success('Cập nhật thành công!', {
// 				position: 'top',
// 				duration: 3000
// 			});
// 		} else {
// 			// Nếu chưa có => thêm mới
// 			await axios.post(`${urlServer}/registerUseBot`, {
// 				botId: selectedBotId.value,
// 				templateMessage: text.value,
// 				token
// 			});

// 			// Cập nhật lại danh sách bots sau khi thêm mới
// 			await getBot()
// 			toast.success('Thêm mới thành công và đang training AI!', {
// 				position: 'top',
// 				duration: 3000
// 			});
// 		}
// 	} catch (error) {
// 		toast.error('Lỗi khi lưu dữ liệu!', {
// 			position: 'top',
// 			duration: 3000
// 		});
// 	}
// }

// Cập nhật templateMessage khi người dùng chọn bot
watch(selectedBotId, async (newId) => {
	const selectedBot = bots.value.find(bot => bot._id === newId)
	if (!selectedBot) return toast.error('Lỗi khi chọn bot!', {
			position: 'top',
			duration: 3000
		})
	selectedBotId.value = selectedBot?._id
	await getFile()
})

const openModalChoose = () => {
	fileInput.value!.value = ''
	if (!selectedBotId.value) return toast.error('Vui lòng chọn 1 bot!', {
		position: 'top',
		duration: 3000
	})
	const modalChoose: any = document.getElementById('modal_bot_chosse_file')
	if (modalChoose?.showModal) modalChoose.showModal()
}

const closeModelAddFile = () => {
	selectedFile.value = null;
	const modal: any = document.getElementById('modal_bot_chosse_file')
	if (modal?.close) modal.close()
	const modalFile: any = document.getElementById('modal_bot_file')
	if (modalFile?.showModal) modalFile.showModal()
}

function triggerFileInput() {
	fileInput.value?.click()
}

const handleFileChange = (event: Event) => {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];

  if (file) {
    const allowedTypes = [
      'text/plain',                // .txt
      'application/pdf',          // .pdf
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document' // .docx
    ]

    if (!allowedTypes.includes(file.type)) {
      input.value = '' // reset input
      toast.error('Sai định dạng file !', {
      position: 'top',
      duration: 3000
      })
      return
    }

    const previewUrl = URL.createObjectURL(file);
    selectedFile.value = { file, previewUrl };
  }
}

const uploadImage = async () => {
	const token = localStorage.getItem('token')
	if (!selectedFile.value) {
		toast.error('Vui lòng chọn file tải lên!', { position: 'top', duration: 3000 });
		return;
	}

	try {
		const formData = new FormData()
		formData.append('token', token || '')
		formData.append('bot', selectedBotId.value) // idBot.value là string
		formData.append('file', selectedFile.value.file) // file là File object

		const response = await axios.post(`${urlServer}/create-file-user`, formData, {
			headers: {
				'Content-Type': 'multipart/form-data'
			}
		})

		if (response.data.status === 400)
		{
			router.push('/login')
			localStorage.clear()
			return
		}

		toast.success('Tải file thành công!', { position: 'top', duration: 3000 })
		selectedFile.value = null;
		const modal: any = document.getElementById('modal_bot_chosse_file')
		if (modal?.close) modal.close()

		await getFile()

	} catch (error) {
		toast.error('Lỗi khi tải file!', { position: 'top', duration: 3000 });
	}
}

const getFile = async () => {
		const token = localStorage.getItem('token')
		try {
		const formData = new FormData()
		formData.append('token', token || '')
		formData.append('bot', selectedBotId.value) // idBot.value là string

		const response = await axios.post(`${urlServer}/get-file-user`, formData, {
			headers: {
				'Content-Type': 'multipart/form-data'
			}
		})
		if (response.data.status === 400)
		{
			router.push('/login')
			localStorage.clear()
			return
		}
		selectedFiles.value = response.data
	} catch (error) {
		toast.error('Lỗi khi tải file!', { position: 'top', duration: 3000 });
	}
}

const isImageFile = (file: string) => {
  return file?.startsWith('image/');
}

const getFileType = (file: string) => {
  // Lấy đuôi file từ URL
  const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'];
  if (imageExtensions.includes(file)) {
    return file.toUpperCase(); // Trả về đuôi ảnh (ví dụ JPG, PNG)
  }
  // Kiểm tra các loại file dựa trên đuôi file
  if (file === 'application/pdf') return "pdf";
  if (file === 'application/msword' || file === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') return 'world';
  if (file === 'text/plain;charset=utf-8') return "txt"

	 // Trường hợp không xác định, trả về Unknown
  return file.toUpperCase() || 'Unknown';
}

const removeFile = async (id: string) => {
  try {
    await axios.put(`${urlServer}/delete-file-user/` + id)
    toast.success('Xóa file thành công!', { position: 'top', duration: 3000 })
		selectedFiles.value = selectedFiles.value.filter(bot => bot._id !== id)
  } catch (error) {
    toast.error('Lỗi khi xóa file!', { position: 'top', duration: 3000 })
  }
}

const isTextFile = (type: string | undefined): boolean => {
  return typeof type === 'string' && type.startsWith('text/')
}

const isPdfFile = (type: string | undefined): boolean => {
  return type === 'application/pdf'
}

const isDocFile = (type: string | undefined): boolean => {
  // Kiểm tra nếu type là chuỗi và thuộc một trong các loại file Word
  return type ? ['application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'].includes(type) : false;
}
</script>

<template>
	<div class="min-h-[calc(100vh-5rem)] text-black">
		<div class="p-5 flex flex-col rounded-md  gap-3">
			<div class="flex gap-2">
				<h1 class="card-title">Quản lý kho ảnh</h1>
				<button class="btn btn-circle btn-success text-white" @click="openModalChoose">+</button>
			</div>

			<select class="select" v-model="selectedBotId">
				<option disabled value="">Chọn 1 Bot AI</option>
				<option v-for="bot in bots" :key="bot._id" :value="bot._id">
					{{ bot.name }}
				</option>
			</select>
		</div>

		<div class="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 scroll-file">
          <!-- Nếu có file -->
          <template v-if="selectedFiles.length">
            <div v-for="(file, index) in selectedFiles" :key="index" class="card bg-base-100 shadow-md">
              <a :href="file.url" target="_blank" rel="noopener noreferrer" class="block">
                <figure v-if="isImageFile(file.typeFile)" class="rounded-t-lg">
                  <img :src="file.url ?? undefined" class="w-full h-64 object-cover" />
                </figure>

                <figure v-else-if="getFileType(file.typeFile) === 'pdf'" class="rounded-t-lg">
                  <img src="https://upload.wikimedia.org/wikipedia/commons/8/87/PDF_file_icon.svg" class="w-full h-64 object-cover" alt="PDF Logo" />
                </figure>

                <figure v-else-if="getFileType(file.typeFile) === 'world'" class="rounded-t-lg">
                  <img src="https://upload.wikimedia.org/wikipedia/commons/f/fd/Microsoft_Office_Word_%282019%E2%80%93present%29.svg" class="w-full h-64 object-cover" alt="Word Logo" />
                </figure>

                <figure v-else-if="getFileType(file.typeFile) === 'txt'" class="rounded-t-lg">
                  <img src="https://upload.wikimedia.org/wikipedia/commons/2/23/Text-txt.svg" class="w-full h-64 object-cover" alt="TXT Logo" />
                </figure>

                <div class="card-body p-4">
                  <h2 class="card-title truncate">{{ file.name }}</h2>

                  <p class="text-sm text-gray-500" v-if="!isImageFile(file.typeFile)">
                    Loại file: {{ getFileType(file.typeFile) }}
                  </p>
                  <p class="text-sm text-gray-500" v-else>
                    Loại file: {{ getFileType(file.typeFile) }}
                  </p>
                </div>
              </a>
              <div class="flex justify-center mt-2 mb-2">
                <button class="btn btn-circle btn-outline btn-error mr-2" @click="removeFile(file._id)">
                  🗑️
                </button>
              </div>
            </div>
          </template>

          <!-- Nếu chưa có file -->
          <div v-else
            class="col-span-full flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg p-4">
            <span class="text-gray-400">Chưa có file</span>
          </div>
        </div>
	</div>

	<dialog id="modal_bot_chosse_file" class="modal">
		<div class="modal-box max-w-md w-full bg-base-200">
			<!-- Tiêu đề -->
			<div class="flex justify-between items-center mb-4">
				<h1 class="text-xl font-bold">Thêm file mới</h1>
				<button class="btn btn-sm btn-circle btn-ghost" @click="closeModelAddFile">✕</button>
			</div>

			<!-- Chọn ảnh Upload -->
			<div class="mb-4">
				<label class="block text-gray-700 text-sm font-semibold mb-2">Chọn file Upload</label>

				<div
					class="relative flex items-center justify-center border-2 border-dashed border-gray-400 rounded-lg overflow-hidden w-100 h-100 cursor-pointer"
					@click="triggerFileInput">
					<template v-if="selectedFile && isImageFile(selectedFile.file?.type)">
						<!-- Ảnh -->
						<img :src="selectedFile.previewUrl" class="object-cover w-full h-full" />
					</template>

					<template v-else-if="selectedFile && isPdfFile(selectedFile.file?.type)">
						<!-- PDF -->
						<img src="https://upload.wikimedia.org/wikipedia/commons/8/87/PDF_file_icon.svg" class="object-cover w-full h-full" alt="PDF" />
					</template>

					<template v-else-if="selectedFile && isDocFile(selectedFile.file?.type)">
						<!-- DOC / DOCX -->
						<img src="https://upload.wikimedia.org/wikipedia/commons/f/fd/Microsoft_Office_Word_%282019%E2%80%93present%29.svg" class="object-cover w-full h-full" alt="Word" />
					</template>
					<template v-else-if="selectedFile && isTextFile(selectedFile.file?.type)">
						<img src="https://upload.wikimedia.org/wikipedia/commons/2/23/Text-txt.svg" class="object-cover w-full h-full" />
					</template>
					<template v-else>
						<div class="flex flex-col items-center justify-center text-gray-400">
							<svg xmlns="http://www.w3.org/2000/svg" class="h-10 w-10" fill="none" viewBox="0 0 24 24"
								stroke="currentColor">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
									d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4-4m0 0l-4 4m4-4v12" />
							</svg>
							<span class="mt-2">Chọn file để upload</span>
						</div>
					</template>
				</div>

				<!-- input file ẩn -->
				<input ref="fileInput" type="file" class="hidden" accept=".pdf,.txt,.docx"
					@change="handleFileChange" />
			</div>

			<!-- Nút Tải ảnh lên -->
			<div class="flex justify-end">
				<button class="btn btn-success text-white" @click="uploadImage">Tải file lên</button>
			</div>
		</div>

		<form method="dialog" class="modal-backdrop">
			<button>close</button>
		</form>
	</dialog>
	<!-- <div>
		<h1 class="text-black">Tính năng đang phát triển, vui lòng quay lại sau !</h1>
	</div> -->
</template>




<style>
.select {
	color: black;
	width: fit-content !important;
}

.textarea {
	background-color: var(--color-white);
	border: var(--border) solid #0000;
	border-color: #1A1A20;
	color: black;
}
.scroll-file {
	max-height: 730px;
	overflow-y: auto;
	  /* Ẩn scrollbar trên trình duyệt WebKit (Chrome, Safari) */
  scrollbar-width: none; /* Firefox */
  -ms-overflow-style: none; /* IE 10+ */
}
.scroll-file::-webkit-scrollbar {
  display: none; /* Chrome, Safari */
}

</style>
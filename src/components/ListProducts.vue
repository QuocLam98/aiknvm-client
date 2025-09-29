<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import axios from 'axios';
import { useToast } from 'vue-toast-notification';
import { useRouter } from 'vue-router';

interface File {
	_id: string,
	name: string,
	url: string,
	description: string,
	price: string,
	type: string
}


const router = useRouter()
const toast = useToast();
const maxLength = 15500;
const text = ref('');
const charCount = computed(() => `${text.value.length}/${maxLength}`);
const listFile = ref<File[]>([])
const urlServer = import.meta.env.VITE_URL_SERVER
const selectedFile = ref<{ previewUrl: string; file: File } | null>(null);
const fileInput = ref<HTMLInputElement>()

onMounted(async () => {
})

const openModalChoose = () => {
	fileInput.value!.value = ''
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
	console.log(type)
  // Kiểm tra nếu type là chuỗi và thuộc một trong các loại file Word
  return type ? ['application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'].includes(type) : false;
}
</script>

<template>
	<div class="min-h-[calc(100vh-5rem)] text-black">
		<div class="p-5 flex flex-col rounded-md  gap-3">
			<div class="flex gap-2">
				<h1 class="card-title">Quản lý sản phẩm</h1>
				<button class="btn btn-circle btn-success text-white" @click="openModalChoose">+</button>
			</div>
		</div>

		<div class="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 scroll-file">
          <!-- Nếu có file -->
          <template v-if="listFile.length">
            <div v-for="(file, index) in listFile" :key="index" class="card bg-base-100 shadow-md">
              <a :href="file.url" target="_blank" rel="noopener noreferrer" class="block">
                <figure v-if="isImageFile(file.type)" class="rounded-t-lg">
                  <img :src="file.url ?? undefined" class="w-full h-64 object-cover" />
                </figure>

                <figure v-else-if="getFileType(file.type) === 'pdf'" class="rounded-t-lg">
                  <img src="https://upload.wikimedia.org/wikipedia/commons/8/87/PDF_file_icon.svg" class="w-full h-64 object-cover" alt="PDF Logo" />
                </figure>

                <figure v-else-if="getFileType(file.type) === 'world'" class="rounded-t-lg">
                  <img src="https://upload.wikimedia.org/wikipedia/commons/f/fd/Microsoft_Office_Word_%282019%E2%80%93present%29.svg" class="w-full h-64 object-cover" alt="Word Logo" />
                </figure>

                <figure v-else-if="getFileType(file.type) === 'txt'" class="rounded-t-lg">
                  <img src="https://upload.wikimedia.org/wikipedia/commons/2/23/Text-txt.svg" class="w-full h-64 object-cover" alt="TXT Logo" />
                </figure>

                <div class="card-body p-4">
                  <h2 class="card-title truncate">{{ file.name }}</h2>

                  <p class="text-sm text-gray-500" v-if="!isImageFile(file.type)">
                    Loại file: {{ getFileType(file.type) }}
                  </p>
                  <p class="text-sm text-gray-500" v-else>
                    Loại file: {{ getFileType(file.type) }}
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
            <span class="text-gray-400">Chưa có sản phẩm</span>
          </div>
        </div>
	</div>

	<dialog id="modal_bot_chosse_file" class="modal">
		<div class="modal-box max-w-md w-full bg-base-200">
			<!-- Tiêu đề -->
			<div class="flex justify-between items-center mb-4">
				<h1 class="text-xl font-bold">Thêm sản phẩm mới</h1>
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
				<input ref="fileInput" type="file" class="hidden" accept=".pdf,.txt,.docx,image/*,.doc"
					@change="handleFileChange" />
			</div>
			
			<div class="mb-4">
				<label>Tên sản phẩm</label>
				<input type="text" class="input"/>
			</div>

			<div class="mb-4">
				<label>Giá tiền</label>
				<input type="number" class="input"/>
			</div>

			<div class="mb-4">
				<label>Mô tả</label>
				<input type="text" class="input"/>
			</div>

			<!-- Nút Tải ảnh lên -->
			<div class="flex justify-end">
				<button class="btn btn-success text-white" @click="uploadImage">Xác nhận</button>
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
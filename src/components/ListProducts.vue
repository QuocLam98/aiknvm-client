<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch } from 'vue';
import axios from 'axios';
import { useToast } from 'vue-toast-notification';
import { useRouter } from 'vue-router';

interface File {
	_id: string,
	name: string,
	url: string,
	description: string,
	price: string,
	type: string,
	fileType: string
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

// Form tạo store (sản phẩm)
const formStore = reactive({
	name: '',
	description: '',
	url: '',        // sẽ được set sau khi upload
	price: '',
	fileType: '',   // auto từ response upload
	type: ''
})
const uploading = ref(false)
const uploadProgress = ref(0) // 0-100 (fake progress)
let uploadTimer: any = null
const submitting = ref(false)
// Edit Store state
const editing = ref(false)
const editSubmitting = ref(false)
const editForm = reactive<{ id: string; name: string; description: string; price: string; type: string }>({
	id: '',
	name: '',
	description: '',
	price: '',
	type: ''
})

const openEditModal = (store: File) => {
	editForm.id = store._id
	editForm.name = store.name
	editForm.description = store.description
	editForm.price = store.price
	editForm.type = store.type
	editing.value = true
	const modal: any = document.getElementById('modal_edit_store')
	if (modal?.showModal) modal.showModal()
}

const resetEdit = () => {
	editForm.id = ''
	editForm.name = ''
	editForm.description = ''
	editForm.price = ''
	editForm.type = ''
	editing.value = false
}

const validateEdit = () => {
	if (editForm.name.trim().length < 2) { toast.error('Tên tối thiểu 2 ký tự', {position:'top'}); return false }
	if (editForm.description.trim().length < 2) { toast.error('Mô tả tối thiểu 2 ký tự', {position:'top'}); return false }
	const priceNum = Number(editForm.price)
	if (Number.isNaN(priceNum) || priceNum < 0) { toast.error('Giá không hợp lệ', {position:'top'}); return false }
	if (!editForm.type.trim()) { toast.error('Thiếu type', {position:'top'}); return false }
	return true
}

const updateStore = async () => {
	if (editSubmitting.value) return
	if (!validateEdit()) return
	editSubmitting.value = true
	try {
		const payload = {
			id: editForm.id,
			name: editForm.name.trim(),
			description: editForm.description.trim(),
			price: Number(editForm.price),
			type: editForm.type.trim()
		}
		const res = await axios.put(`${urlServer}/update-store`, payload)
		if (res.status === 200) {
			toast.success('Cập nhật thành công', { position:'top', duration: 2000 })
			// Cập nhật danh sách tại chỗ không cần reload toàn bộ
			const idx = listFile.value.findIndex(f => f._id === editForm.id)
			if (idx !== -1) {
				listFile.value[idx].name = payload.name
				listFile.value[idx].description = payload.description
				listFile.value[idx].price = String(payload.price)
				listFile.value[idx].type = payload.type
			}
			const modal: any = document.getElementById('modal_edit_store')
			if (modal?.close) modal.close()
			resetEdit()
		} else {
			toast.error('Cập nhật thất bại', { position:'top' })
		}
	} catch (err: any) {
		const msg = err?.response?.data?.message || 'Lỗi cập nhật'
		toast.error(msg, { position:'top' })
	} finally {
		editSubmitting.value = false
	}
}

const closeEditModal = () => {
	const modal: any = document.getElementById('modal_edit_store')
	if (modal?.close) modal.close()
	resetEdit()
}

const resetFormStore = () => {
	formStore.name = ''
	formStore.description = ''
	formStore.url = ''
	formStore.price = ''
	formStore.fileType = ''
	formStore.type = ''
	uploading.value = false
	uploadProgress.value = 0
	if (uploadTimer) clearInterval(uploadTimer)
}

const validateStoreForm = (): boolean => {
	if (formStore.name.trim().length < 2) {
		toast.error('Tên tối thiểu 2 ký tự', { position: 'top' });
		return false
	}
	if (formStore.description.trim().length < 2) {
		toast.error('Mô tả tối thiểu 2 ký tự', { position: 'top' });
		return false
	}
	try {
		new URL(formStore.url)
	} catch {
		toast.error('URL không hợp lệ', { position: 'top' });
		return false
	}
	const priceNum = Number(formStore.price)
	if (Number.isNaN(priceNum) || priceNum < 0) {
		toast.error('Giá phải là số >= 0', { position: 'top' });
		return false
	}
	if (!formStore.fileType) {
			toast.error('Chưa upload file hoặc fileType trống', { position: 'top' });
			return false
	}
	if (!formStore.type) {
		toast.error('Thiếu type', { position: 'top' });
		return false
	}
	return true
}

// Gọi API tạo store
const addStore = async () => {
	if (submitting.value) return
	if (uploading.value) {
		toast.info('Đang upload file, vui lòng đợi...', { position: 'top' })
		return
	}
	if (!validateStoreForm()) return
	submitting.value = true
	try {
		const payload = {
			name: formStore.name.trim(),
			description: formStore.description.trim(),
			url: formStore.url.trim(),
			price: Number(formStore.price),
			fileType: formStore.fileType.trim(),
			type: formStore.type.trim()
		}
		const res = await axios.post(`${urlServer}/create-store`, payload)
		if (res.status === 200 || res.data?._id) {
			toast.success('Tạo sản phẩm thành công', { position: 'top', duration: 2500 })
			// Reload danh sách về trang 1
			page.value = 1
			await loadStores(1)
			// đóng modal và reset form
			const modal: any = document.getElementById('modal_bot_chosse_file')
			if (modal?.close) modal.close()
			resetFormStore()
		} else {
			toast.error('Tạo thất bại', { position: 'top' })
		}
	} catch (err: any) {
		const msg = err?.response?.data?.message || 'Lỗi khi tạo sản phẩm'
		toast.error(msg, { position: 'top' })
	} finally {
		submitting.value = false
	}
}

// Trạng thái tải danh sách store (load thêm)
const page = ref(1) // backend vẫn dùng page
const limit = ref(12)
const total = ref(0)
const loading = ref(false)
const hasMore = computed(() => listFile.value.length < total.value)

// Hàm gọi API lấy danh sách store (sản phẩm)
// loadStores: nếu goPage > 1 sẽ append dữ liệu
const loadStores = async (goPage: number = page.value) => {
	try {
		loading.value = true
		page.value = goPage
		const response = await axios.get(`${urlServer}/list-store`, {
			params: {
				page: page.value,
				limit: limit.value
			}
		})

		if (response.data?.status !== 200) {
			toast.error('Tải danh sách sản phẩm thất bại!', { position: 'top', duration: 3000 })
			return
		}

		const data: any[] = response.data.data || []
		total.value = response.data.total || 0
		// Map dữ liệu về interface File (có fallback tên field)
			const mapped = data.map(item => ({
			_id: item._id,
			name: item.name ?? item.title ?? 'No name',
			url: item.url ?? item.fileUrl ?? '',
			description: item.description ?? '',
			price: (item.price !== undefined && item.price !== null) ? String(item.price) : '',
			type: item.type ?? item.mimeType ?? '',
			fileType: item.fileType ?? item.typeFile ?? ''
		}))
			if (page.value === 1) {
				listFile.value = mapped
			} else {
				// tránh trùng id
				const existingIds = new Set(listFile.value.map(f => f._id))
				for (const m of mapped) {
					if (!existingIds.has(m._id)) listFile.value.push(m)
				}
			}
	} catch (e) {
		toast.error('Lỗi kết nối server!', { position: 'top', duration: 3000 })
	} finally {
		loading.value = false
	}
}
	const loadMore = () => {
		if (!hasMore.value || loading.value) return
		loadStores(page.value + 1)
	}

onMounted(async () => {
	await loadStores()
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
  resetFormStore()
}

function triggerFileInput() {
	fileInput.value?.click()
}

const handleFileChange = async (event: Event) => {
	const input = event.target as HTMLInputElement
	const file = input.files?.[0]
	if (!file) return

	const allowedTypes = [
		'text/plain',
		'application/pdf',
		'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
		'image/png','image/jpeg','image/jpg','image/gif','image/webp'
	]
	if (!allowedTypes.includes(file.type)) {
		input.value = ''
		toast.error('Sai định dạng file !', { position: 'top', duration: 3000 })
		return
	}

	// Khởi tạo progress giả 3-5 giây
	uploading.value = true
	uploadProgress.value = 0
	const targetDuration = 3000 + Math.random()*2000 // 3-5s
	const start = Date.now()
	if (uploadTimer) clearInterval(uploadTimer)
	uploadTimer = setInterval(() => {
		const elapsed = Date.now() - start
		uploadProgress.value = Math.min(95, Math.floor(elapsed / targetDuration * 100)) // giữ < 100 cho tới khi xong
	}, 120)

	try {
		const form = new FormData()
		form.append('file', file)
		const res = await axios.post(`${urlServer}/upload-file-store`, form, {
			headers: { 'Content-Type': 'multipart/form-data' }
		})
		// Hoàn tất progress
		uploadProgress.value = 100
		formStore.url = res.data
		formStore.fileType = file.type
		// set preview
		selectedFile.value = { previewUrl: URL.createObjectURL(file), file: { _id:'', name:file.name, url:res.data, description:'', price:'', type:file.type, fileType:file.type } }
		toast.success('Upload thành công', { position: 'top', duration: 2000 })
	} catch (err: any) {
		toast.error('Upload thất bại', { position: 'top', duration: 3000 })
		fileInput.value && (fileInput.value.value = '')
		formStore.url = ''
		formStore.fileType = ''
		selectedFile.value = null
	} finally {
		uploading.value = false
		if (uploadTimer) {
			clearInterval(uploadTimer)
			uploadTimer = null
		}
	}
}


const isImageFile = (file: string) => {
  return file?.startsWith('image/');
}

// Trạng thái xóa store
const deletingIds = ref<Set<string>>(new Set())
const confirmDeleteId = ref<string | null>(null)

const openConfirmDelete = (id: string) => {
	confirmDeleteId.value = id
	const modal: any = document.getElementById('modal_confirm_delete')
	if (modal?.showModal) modal.showModal()
}

const cancelDelete = () => {
	confirmDeleteId.value = null
	const modal: any = document.getElementById('modal_confirm_delete')
	if (modal?.close) modal.close()
}

const confirmDelete = async () => {
	if (!confirmDeleteId.value) return
	await removeStore(confirmDeleteId.value)
	cancelDelete()
}

// Xóa store (PUT /remove-store) (không confirm trực tiếp, đã có modal)
const removeStore = async (id: string) => {
  if (deletingIds.value.has(id)) return
  deletingIds.value.add(id)
  try {
    const res = await axios.put(`${urlServer}/remove-store`, { id })
    if (res.status === 200 || res.data?.status === 200) {
      listFile.value = listFile.value.filter(f => f._id !== id)
      total.value = Math.max(0, total.value - 1)
      toast.success('Đã xóa sản phẩm', { position: 'top', duration: 2000 })
    } else {
      toast.error('Xóa sản phẩm thất bại', { position: 'top' })
    }
  } catch (err) {
    toast.error('Lỗi khi xóa sản phẩm', { position: 'top' })
  } finally {
    deletingIds.value.delete(id)
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
						<div v-for="(file, index) in listFile" :key="index" class="card bg-base-100 shadow-md relative">
							<button class="btn btn-xs btn-circle absolute top-2 left-2" @click.stop="openEditModal(file)" title="Sửa">
								✎
							</button>
							<a :href="file.url" target="_blank" rel="noopener noreferrer" class="block">
								<figure class="rounded-t-lg flex items-center justify-center bg-base-200 h-48 overflow-hidden">
									<img v-if="file.fileType && file.fileType.startsWith('image/')" :src="file.url" class="w-full h-full object-cover" />
									<img v-else-if="file.fileType === 'application/pdf'" src="https://upload.wikimedia.org/wikipedia/commons/8/87/PDF_file_icon.svg" class="w-24 h-24 object-contain" alt="PDF" />
									<img v-else-if="file.fileType === 'application/msword' || file.fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'" src="https://upload.wikimedia.org/wikipedia/commons/f/fd/Microsoft_Office_Word_%282019%E2%80%93present%29.svg" class="w-24 h-24 object-contain" alt="Word" />
									<img v-else-if="file.fileType && file.fileType.startsWith('text/')" src="https://upload.wikimedia.org/wikipedia/commons/2/23/Text-txt.svg" class="w-20 h-20 object-contain" alt="TXT" />
									<div v-else class="text-xs text-gray-500 p-2 text-center">NO PREVIEW</div>
								</figure>
												<div class="card-body p-4 space-y-1">
													<h2 class="card-title truncate" :title="file.name">Tên sản phẩm: {{ file.name }}</h2>
													<p class="text-sm font-semibold text-primary">Giá tiền: {{ file.price ? new Intl.NumberFormat('vi-VN',{style:'currency',currency:'VND'}).format(Number(file.price)) : 'Miễn phí' }}</p>
													<p class="text-xs text-gray-600 line-clamp-2" :title="file.description">Mô tả: {{ file.description || 'Không có mô tả' }}</p>
													<div class="text-[11px] uppercase tracking-wide text-gray-400">Loại: {{ file.type || 'N/A' }}</div>
												</div>
							</a>
              <div class="flex justify-center mt-2 mb-2">
												<button class="btn btn-circle btn-outline btn-error mr-2" :disabled="deletingIds.has(file._id)" @click="openConfirmDelete(file._id)">
									<span v-if="!deletingIds.has(file._id)">🗑️</span>
									<span v-else class="loading loading-spinner loading-xs"></span>
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
		<div class="flex justify-center items-center py-4" v-if="hasMore">
			<button class="btn btn-outline" :disabled="loading" @click="loadMore">
				<span v-if="!loading">Hiển thị thêm</span>
				<span v-else class="loading loading-spinner loading-sm"></span>
			</button>
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
					class="relative flex items-center justify-center border-2 border-dashed border-gray-400 rounded-lg overflow-hidden w-100 h-64 cursor-pointer"
					@click="triggerFileInput">
					<template v-if="selectedFile">
						<img v-if="isImageFile(selectedFile.file?.type)" :src="selectedFile.previewUrl" class="object-cover w-full h-full" />
						<img v-else-if="isPdfFile(selectedFile.file?.type)" src="https://upload.wikimedia.org/wikipedia/commons/8/87/PDF_file_icon.svg" class="object-contain w-28 h-28" alt="PDF" />
						<img v-else-if="isDocFile(selectedFile.file?.type)" src="https://upload.wikimedia.org/wikipedia/commons/f/fd/Microsoft_Office_Word_%282019%E2%80%93present%29.svg" class="object-contain w-28 h-28" alt="Word" />
						<img v-else-if="isTextFile(selectedFile.file?.type)" src="https://upload.wikimedia.org/wikipedia/commons/2/23/Text-txt.svg" class="object-contain w-28 h-28" />
						<div v-else class="text-xs text-gray-400">Không hỗ trợ preview</div>
					</template>
					<template v-else>
						<div class="flex flex-col items-center justify-center text-gray-400">
							<svg xmlns="http://www.w3.org/2000/svg" class="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4-4m0 0l-4 4m4-4v12" />
							</svg>
							<span class="mt-2">Chọn file để upload</span>
						</div>
					</template>
					<!-- Overlay progress -->
					<div v-if="uploading" class="absolute inset-0 bg-black/50 flex flex-col items-center justify-center gap-2 text-white text-sm">
						<div>Đang upload {{ uploadProgress }}%</div>
						<progress class="progress w-40" :value="uploadProgress" max="100"></progress>
					</div>
					<div v-else-if="formStore.fileType" class="absolute top-2 right-2 badge badge-success">{{ formStore.fileType }}</div>
				</div>

				<!-- input file ẩn -->
				<input ref="fileInput" type="file" class="hidden" accept=".pdf,.txt,.docx,image/*,.doc"
					@change="handleFileChange" />
			</div>
			
			<div class="mb-3">
				<label class="block mb-1 font-medium">Tên sản phẩm</label>
				<input v-model="formStore.name" type="text" class="input input-bordered w-full" placeholder="Nhập tên" />
			</div>
			<div class="mb-3">
				<label class="block mb-1 font-medium">Mô tả</label>
				<textarea v-model="formStore.description" class="textarea textarea-bordered w-full" rows="2" placeholder="Mô tả ngắn"></textarea>
			</div>
			<div class="mb-3">
				<label class="block mb-1 font-medium">Giá</label>
				<input v-model="formStore.price" type="number" min="0" class="input input-bordered w-full" placeholder="0" />
			</div>
			<div class="mb-3">
				<label class="block mb-1 font-medium">Type</label>
				<input v-model="formStore.type" type="text" class="input input-bordered w-full" placeholder="Loại (category)" />
			</div>


			<!-- Nút Tải ảnh lên -->
			<div class="flex justify-end gap-2">
				<button class="btn" type="button" @click="closeModelAddFile" :disabled="submitting || uploading">Hủy</button>
				<button class="btn btn-success text-white" :class="{loading: submitting}" :disabled="submitting || uploading || !formStore.url || !formStore.fileType" @click="addStore">
					<span v-if="!submitting">Lưu</span>
					<span v-else class="loading loading-spinner loading-sm"></span>
				</button>
			</div>
		</div>

		<form method="dialog" class="modal-backdrop">
			<button>close</button>
		</form>
	</dialog>

	<!-- Modal confirm delete -->
	<dialog id="modal_confirm_delete" class="modal">
		<div class="modal-box max-w-sm w-full bg-base-200">
			<h3 class="font-bold text-lg mb-2">Xác nhận xóa</h3>
			<p class="text-sm mb-4">Bạn có chắc muốn xóa sản phẩm này? Hành động này sẽ ẩn sản phẩm (soft delete).</p>
			<div class="flex justify-end gap-2">
				<button class="btn" @click="cancelDelete">Hủy</button>
				<button class="btn btn-error text-white" :class="{loading: confirmDeleteId && deletingIds.has(confirmDeleteId)}" :disabled="(!confirmDeleteId) || (!!confirmDeleteId && deletingIds.has(confirmDeleteId))" @click="confirmDelete">
					<span v-if="!(confirmDeleteId && deletingIds.has(confirmDeleteId))">Xóa</span>
					<span v-else class="loading loading-spinner loading-sm"></span>
				</button>
			</div>
		</div>
		<form method="dialog" class="modal-backdrop">
			<button @click="cancelDelete">close</button>
		</form>
	</dialog>

	<!-- Modal edit store -->
	<dialog id="modal_edit_store" class="modal">
		<div class="modal-box max-w-md w-full bg-base-200">
			<div class="flex justify-between items-center mb-4">
				<h1 class="text-xl font-bold">Sửa sản phẩm</h1>
				<button class="btn btn-sm btn-circle btn-ghost" @click="closeEditModal">✕</button>
			</div>
			<div class="space-y-3">
				<div>
					<label class="block text-sm font-medium mb-1">Tên sản phẩm</label>
					<input v-model="editForm.name" type="text" class="input input-bordered w-full" />
				</div>
				<div>
					<label class="block text-sm font-medium mb-1">Mô tả</label>
					<textarea v-model="editForm.description" rows="2" class="textarea textarea-bordered w-full"></textarea>
				</div>
				<div>
					<label class="block text-sm font-medium mb-1">Giá</label>
					<input v-model="editForm.price" type="number" min="0" class="input input-bordered w-full" />
				</div>
				<div>
					<label class="block text-sm font-medium mb-1">Type</label>
					<input v-model="editForm.type" type="text" class="input input-bordered w-full" />
				</div>
			</div>
			<div class="flex justify-end gap-2 mt-5">
				<button class="btn" :disabled="editSubmitting" @click="closeEditModal">Hủy</button>
				<button class="btn btn-primary text-white" :class="{loading: editSubmitting}" :disabled="editSubmitting" @click="updateStore">
					<span v-if="!editSubmitting">Lưu</span>
					<span v-else class="loading loading-spinner loading-sm"></span>
				</button>
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
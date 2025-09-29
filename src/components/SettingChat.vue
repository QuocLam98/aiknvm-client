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

interface UseBot {
	_id: string; // <-- ID của bản ghi use-bot
	bot: {
		_id: string;
		name: string;
		description?: string;
	};
	templateMessage: string;
	user: string;
}
const router = useRouter()
const toast = useToast();
const maxLength = 15500;
const text = ref('');
const charCount = computed(() => `${text.value.length}/${maxLength}`);

const bots = ref<Bot[]>([]);
const selectedBotId = ref<string>(''); // Khởi tạo rỗng
const useBotDataRaw = ref<UseBot[]>([]);
const urlServer = import.meta.env.VITE_URL_SERVER

const getBot = async () => {
	const token = localStorage.getItem('token');
	if (!token) {
		router.push('/login')
		localStorage.clear()
		return
	}

	let useBotData: UseBot[] = [];
	let adminBotData: Bot[] = [];

	// Gọi API lấy list-use-bot
	try {
		const response = await axios.post(`${urlServer}/list-use-bot`, { token });
		useBotData = Array.isArray(response.data.data) ? response.data.data : [];
		useBotDataRaw.value = useBotData;
	} catch (error) {
		toast.error('Lỗi khi lấy danh sách bot!', {
			position: 'top',
			duration: 3000
		})
	}

	// Gọi API lấy list-bot-admin
	try {
		const response = await axios.get(`${urlServer}/list-bot-chat`);
		const getListBot = response.data
		Array.isArray(getListBot)
		{
			getListBot.forEach((element: any) => {
				element.templateMessage = ''
			})
		}
		const botImage = import.meta.env.VITE_CREATE_IMAGE
		const botImagePremium = import.meta.env.VITE_CREATE_IMAGE_PREMIUM
		adminBotData = Array.isArray(getListBot)
			? getListBot.filter((bot: { _id: string }) => bot._id !== botImage && bot._id !== botImagePremium)
			: [];
	} catch (error) {
		toast.error('Lỗi khi lấy danh sách bot!', {
			position: 'top',
			duration: 3000
		})
	}

	// Lấy danh sách bots đã sử dụng từ UseBot, lấy template từ UseBot
	const usedBots: Bot[] = useBotData.map(u => {
		// Kiểm tra sự tồn tại của u.bot và lấy dữ liệu
		const bot = u.bot ? {
			_id: u.bot._id,
			name: u.bot.name,
			templateMessage: u.templateMessage || '', // Nếu không có template trong UseBot thì lấy từ bot
		} : null;

		return bot;
	}).filter(bot => bot !== null); // Lọc bỏ những bot không hợp lệ (null)

	// Lọc bot admin mà chưa có trong useBotData
	const usedBotIds = useBotData.map(u => u.bot._id);
	const newBots = adminBotData.filter(adminBot => !usedBotIds.includes(adminBot._id));

	// Cập nhật danh sách bots
	bots.value = [...usedBots, ...newBots];
}

onMounted(async () => {
	await getBot()
});

const addTemplate = async () => {
	const token = localStorage.getItem('token');
	if (!selectedBotId.value) return alert('Vui lòng chọn một Bot!');

	// Tìm bản ghi useBot theo bot._id
	const existingUseBot = useBotDataRaw.value.find(u => u.bot._id === selectedBotId.value);
	try {
		if (existingUseBot && existingUseBot._id) {
			// Nếu đã tồn tại bản ghi => cập nhật
			const response = await axios.put(`${urlServer}/update-use-bot/` + existingUseBot._id, {
				templateMessage: text.value,
			})

			if (response.data.status === 400) {
				router.push('/login')
				localStorage.clear()
				return
			}

			await getBot()
			toast.success('Cập nhật thành công!', {
				position: 'top',
				duration: 3000
			});
		} else {
			// Nếu chưa có => thêm mới
			const response = await axios.post(`${urlServer}/registerUseBot`, {
				botId: selectedBotId.value,
				templateMessage: text.value,
				token
			});

			if (response.data.status === 400) {
				router.push('/login')
				localStorage.clear()
				return
			}

			// Cập nhật lại danh sách bots sau khi thêm mới
			await getBot()
			toast.success('Thêm mới thành công và đang training AI!', {
				position: 'top',
				duration: 3000
			});
		}
	} catch (error) {
		toast.error('Lỗi khi lưu dữ liệu!', {
			position: 'top',
			duration: 3000
		});
	}
};

// Cập nhật templateMessage khi người dùng chọn bot
watch(selectedBotId, (newId) => {
	const selectedBot = bots.value.find(bot => bot._id === newId);
	if (selectedBot) {
		text.value = selectedBot.templateMessage || ''; // Nếu templateMessage là undefined, gán là chuỗi rỗng
	} else {
		text.value = ''; // Nếu không tìm thấy bot, gán là chuỗi rỗng
	}
});
</script>

<template>
	<div class="pb-10 pt-10 min-h-[calc(100vh-5rem)] text-black">
		<div class="lg:px-10">
			<div class="bg-white p-8 flex flex-col rounded-md shadow gap-3">
				<h1 class="card-title">Cấu hình nội dung</h1>

				<select class="select" v-model="selectedBotId">
					<option disabled value="">Chọn 1 Bot AI</option>
					<!-- Duyệt qua danh sách bots và hiển thị tên bot -->
					<option v-for="bot in bots" :key="bot._id" :value="bot._id">
						{{ bot.name }}
					</option>
				</select>

				<div class="form-control">
					<label class="label mb-3">
						<span>Số ký tự : </span>
						<span class="text-sm opacity-80">{{ charCount }}</span>
					</label>
					<textarea class="textarea textarea-bordered w-full" rows="9" v-model="text"></textarea>
				</div>

				<div class="border-t border-dashed space-x-5 flex px-2 py-5 mt-3">
					<button class="btn btn-success" @click="addTemplate">
						Lưu và training AI
					</button>
				</div>
			</div>
		</div>
	</div>
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
</style>
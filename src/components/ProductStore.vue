<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch, nextTick } from 'vue';
import axios from 'axios';
import { useToast } from 'vue-toast-notification';
import { useRouter } from 'vue-router';

type StoreProduct = {
  _id: string;
  name: string;
  description: string;
  price: string;
  url: string;
  type: string;
  fileType: string;
  level: string;
};

const router = useRouter();
const toast = useToast();
const urlServer = import.meta.env.VITE_URL_SERVER;

const products = ref<StoreProduct[]>([]);
const productsLoading = ref(false);
const storeUsed = ref(false);
const userLoading = ref(false);
const errorMessages = ref<string[]>([]);
const page = ref(1);
const limit = ref(12);
const total = ref(0);
const hasMore = ref(true);
const loadingMore = ref(false);
const loadMoreTrigger = ref<HTMLDivElement | null>(null);
let intersectionObserver: IntersectionObserver | null = null;

const previewProduct = ref<StoreProduct | null>(null);
const previewSource = ref('');
const previewText = ref('');
const previewLoading = ref(false);
const previewError = ref('');
const previewModalId = 'product_preview_modal';

const addError = (message: string) => {
  if (!errorMessages.value.includes(message)) {
    errorMessages.value.push(message);
  }
  toast.error(message, { position: 'top', duration: 3000 });
};

const parseStoreUsed = (value: unknown): boolean => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true' || normalized === '1') return true;
    if (normalized === 'false' || normalized === '0') return false;
  }
  if (typeof value === 'number') return value === 1;
  return false;
};

const visibleProducts = computed(() => products.value);

const hasVipHidden = computed(() => !storeUsed.value && products.value.some(product => product.level?.toLowerCase() === 'vip'));

const isLoading = computed(() => productsLoading.value || userLoading.value);

const isVipProduct = (product: StoreProduct) => product.level?.toLowerCase() === 'vip';
const canAccessProduct = (product: StoreProduct) => storeUsed.value || !isVipProduct(product);
const previewEffectClass = (product: StoreProduct) => (canAccessProduct(product) ? '' : 'opacity-30 blur-sm');

const isImageFile = (type: string | undefined) => Boolean(type && type.startsWith('image/'));
const isPdfFile = (type: string | undefined) => type === 'application/pdf';
const isDocFile = (type: string | undefined) => Boolean(type && (type === 'application/msword' || type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'));
const isTextFile = (type: string | undefined) => Boolean(type && type.startsWith('text/'));

const formatPrice = (value: string) => {
  const amount = Number(value);
  if (Number.isNaN(amount) || amount <= 0) {
    return 'Miễn phí';
  }
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
};

const handlePurchase = (_product: StoreProduct) => {
  router.push('/dashboard/payment');
};

const goToUpgrade = () => {
  router.push('/dashboard/payment');
};

const closePreview = () => {
  previewProduct.value = null;
  previewSource.value = '';
  previewText.value = '';
  previewError.value = '';
  previewLoading.value = false;
  const modal = document.getElementById(previewModalId) as HTMLDialogElement | null;
  if (modal?.open) modal.close();
};

const handleModalCancel = (event: Event) => {
  event.preventDefault();
  closePreview();
};

const openPreview = async (product: StoreProduct) => {
  if (!canAccessProduct(product)) return;
  previewProduct.value = product;
  previewLoading.value = true;
  previewError.value = '';
  previewText.value = '';
  previewSource.value = '';

  const modal = document.getElementById(previewModalId) as HTMLDialogElement | null;
  modal?.showModal?.();

  try {
    if (isImageFile(product.fileType) || isPdfFile(product.fileType)) {
      previewSource.value = product.url;
    } else if (isTextFile(product.fileType)) {
      const response = await axios.get(product.url, { responseType: 'text' });
      previewText.value = typeof response.data === 'string' ? response.data : String(response.data ?? '');
    }
  } catch (_error) {
    previewError.value = 'Không thể tải preview. Vui lòng thử lại sau.';
  } finally {
    previewLoading.value = false;
  }
};

const getObserver = () => {
  if (!intersectionObserver) {
    intersectionObserver = new IntersectionObserver(entries => {
      const [entry] = entries;
      if (entry?.isIntersecting && hasMore.value && !loadingMore.value && !productsLoading.value) {
        void fetchProducts(page.value + 1);
      }
    }, {
      root: null,
      rootMargin: '0px 0px 200px 0px',
      threshold: 0,
    });
  }
  return intersectionObserver;
};

const fetchUserAccess = async () => {
  userLoading.value = true;
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      addError('Vui lòng đăng nhập lại.');
      router.push('/login');
      return;
    }
    const response = await axios.post(`${urlServer}/get-user-detail`, { token });
    storeUsed.value = parseStoreUsed(response.data?.storeUsed);
  } catch (error: any) {
    if (error?.response?.status === 401) {
      addError('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
      localStorage.clear();
      router.push('/login');
      return;
    }
    addError('Không thể tải thông tin người dùng.');
  } finally {
    userLoading.value = false;
  }
};

const fetchProducts = async (pageToLoad: number = 1) => {
  if (pageToLoad !== 1 && (!hasMore.value || loadingMore.value)) {
    return;
  }

  if (pageToLoad === 1) {
    if (productsLoading.value) return;
    productsLoading.value = true;
  } else {
    loadingMore.value = true;
  }

  try {
    const response = await axios.get(`${urlServer}/list-store`, {
      params: {
        page: pageToLoad,
        limit: limit.value,
      },
    });

    if (response.data?.status !== 200) {
      addError('Không thể tải danh sách sản phẩm.');
      return;
    }

    const rawItems: any[] = response.data.data || [];
    const mapped = rawItems.map(item => ({
      _id: item._id,
      name: item.name ?? item.title ?? 'No name',
      description: item.description ?? '',
      price: item.price !== undefined && item.price !== null ? String(item.price) : '0',
      url: item.url ?? item.fileUrl ?? '',
      type: item.type ?? item.mimeType ?? '',
      fileType: item.fileType ?? item.typeFile ?? '',
      level: item.level ?? 'basic',
    }));

    if (pageToLoad === 1) {
      products.value = mapped;
    } else {
      const existingIds = new Set(products.value.map(product => product._id));
      for (const product of mapped) {
        if (!existingIds.has(product._id)) {
          products.value.push(product);
        }
      }
    }

    page.value = pageToLoad;

    const totalFromResponse = Number(response.data?.total);
    if (Number.isFinite(totalFromResponse)) {
      total.value = totalFromResponse;
      hasMore.value = products.value.length < total.value;
    } else {
      total.value = products.value.length;
      hasMore.value = mapped.length === limit.value;
    }
  } catch (_error) {
    addError('Không thể tải danh sách sản phẩm.');
  } finally {
    if (pageToLoad === 1) {
      productsLoading.value = false;
    } else {
      loadingMore.value = false;
    }
  }
};

watch(loadMoreTrigger, (newEl, oldEl) => {
  const observer = getObserver();
  if (oldEl) observer.unobserve(oldEl);
  if (newEl) observer.observe(newEl);
});

onMounted(async () => {
  await Promise.allSettled([fetchUserAccess(), fetchProducts(1)]);
  await nextTick();
  if (loadMoreTrigger.value) {
    getObserver().observe(loadMoreTrigger.value);
  }
  const modal = document.getElementById(previewModalId) as HTMLDialogElement | null;
  modal?.addEventListener('cancel', handleModalCancel);
});

onBeforeUnmount(() => {
  const modal = document.getElementById(previewModalId) as HTMLDialogElement | null;
  modal?.removeEventListener('cancel', handleModalCancel);
  closePreview();
  if (intersectionObserver) {
    intersectionObserver.disconnect();
    intersectionObserver = null;
  }
});
</script>

<template>
  <div class="min-h-[calc(100vh-5rem)] bg-base-200 text-black">
    <div class="max-w-6xl px-4 py-10">
      <header class="mb-8">
        <h1 class="text-3xl font-bold">Kho sản phẩm</h1>
        <p class="mt-2 text-gray-600">Khám phá các sản phẩm và chọn gói phù hợp cho nhu cầu của bạn.</p>
      </header>

      <section v-if="!storeUsed && !isLoading && hasVipHidden" class="alert alert-info mb-6">
        <span>Bạn hiện chỉ xem được các sản phẩm Basic. Nâng cấp để mở khóa sản phẩm VIP.</span>
      </section>

      <section v-if="errorMessages.length" class="mb-6 space-y-3">
        <div v-for="message in errorMessages" :key="message" class="alert alert-error shadow">
          <span>{{ message }}</span>
        </div>
      </section>

      <div v-if="isLoading" class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div v-for="n in 6" :key="n" class="h-60 animate-pulse rounded-lg bg-base-100"></div>
      </div>

      <div v-else>
        <template v-if="!visibleProducts.length">
          <p class="text-center text-gray-500">Chưa có sản phẩm phù hợp.</p>
        </template>
        <template v-else>
          <div class="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <article
              v-for="product in visibleProducts"
              :key="product._id"
              class="card bg-base-100 shadow-md"
              :class="{ 'border border-warning/40': isVipProduct(product) }">
              <div
                class="block"
                :class="canAccessProduct(product) ? 'cursor-pointer' : 'cursor-not-allowed'"
                @click="canAccessProduct(product) && openPreview(product)">
                <figure class="relative flex h-48 items-center justify-center overflow-hidden rounded-t-lg bg-base-200">
                  <img
                    v-if="isImageFile(product.fileType)"
                    :src="product.url"
                    :class="['h-full w-full object-cover transition', previewEffectClass(product)]"
                    :alt="product.name" />
                  <img
                    v-else-if="isPdfFile(product.fileType)"
                    src="https://upload.wikimedia.org/wikipedia/commons/8/87/PDF_file_icon.svg"
                    :class="['h-24 w-24 object-contain transition', previewEffectClass(product)]"
                    alt="PDF" />
                  <img
                    v-else-if="isDocFile(product.fileType)"
                    src="https://upload.wikimedia.org/wikipedia/commons/f/fd/Microsoft_Office_Word_%282019%E2%80%93present%29.svg"
                    :class="['h-24 w-24 object-contain transition', previewEffectClass(product)]"
                    alt="Word" />
                  <img
                    v-else-if="isTextFile(product.fileType)"
                    src="https://upload.wikimedia.org/wikipedia/commons/2/23/Text-txt.svg"
                    :class="['h-20 w-20 object-contain transition', previewEffectClass(product)]"
                    alt="TXT" />
                  <div
                    v-else
                    :class="['px-3 text-center text-xs text-gray-500', previewEffectClass(product)]">
                    Không có preview
                  </div>
                  <div
                    v-if="!canAccessProduct(product)"
                    class="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/55 text-white">
                    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24">
                      <path fill="currentColor" d="M12 2a5 5 0 0 0-5 5v3H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2h-1V7a5 5 0 0 0-5-5m-3 5a3 3 0 0 1 6 0v3H9z" />
                    </svg>
                    <span class="text-sm font-semibold">Sản phẩm VIP</span>
                    <span class="text-xs opacity-80">Nâng cấp để xem nội dung</span>
                  </div>
                </figure>
              </div>
              <div class="card-body space-y-2 p-5">
                <h2 class="card-title text-lg" :title="product.name">Tên sản phẩm: {{ product.name }}</h2>
                <p class="text-sm text-gray-600 line-clamp-2" :title="product.description">Mô tả: {{ product.description || 'Không có mô tả' }}</p>
                <div class="text-sm font-semibold text-primary">Giá: {{ formatPrice(product.price) }}</div>
                <div class="text-xs uppercase tracking-wide text-gray-500">Loại: {{ product.type || 'N/A' }}</div>
                <div class="flex flex-wrap gap-2 pt-1">
                  <button
                    v-if="canAccessProduct(product)"
                    type="button"
                    class="btn btn-outline"
                    @click="openPreview(product)">
                    Xem trước
                  </button>
                  <button
                    v-if="canAccessProduct(product)"
                    type="button"
                    class="btn btn-primary"
                    @click="handlePurchase(product)">
                    Mua ngay
                  </button>
                  <button
                    v-else
                    type="button"
                    class="btn btn-outline btn-warning"
                    @click="goToUpgrade">
                    Nâng cấp tài khoản
                  </button>
                </div>
              </div>
            </article>
          </div>
        </template>
        <div v-if="loadingMore" class="flex justify-center py-6">
          <span class="loading loading-spinner loading-md text-primary"></span>
        </div>
      </div>
      <div ref="loadMoreTrigger" v-show="!isLoading" class="h-1 w-full"></div>
    </div>
  </div>

  <dialog :id="previewModalId" class="modal">
    <div class="modal-box max-w-4xl w-full bg-base-200">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-xl font-semibold">Xem trước sản phẩm</h2>
        <button class="btn btn-sm btn-circle btn-ghost" type="button" @click="closePreview">✕</button>
      </div>
      <div v-if="previewLoading" class="flex justify-center py-10">
        <span class="loading loading-spinner loading-lg text-primary"></span>
      </div>
      <div v-else-if="previewError" class="alert alert-error">
        <span>{{ previewError }}</span>
      </div>
      <div v-else-if="previewProduct" class="space-y-4">
        <div>
          <h3 class="text-lg font-semibold">{{ previewProduct.name }}</h3>
          <p class="text-sm text-gray-500">{{ previewProduct.description || 'Không có mô tả' }}</p>
        </div>
        <template v-if="previewProduct.fileType?.startsWith('image/') && previewSource">
          <img :src="previewSource" class="max-h-[70vh] w-full rounded object-contain" :alt="previewProduct.name" />
        </template>
        <template v-else-if="previewProduct.fileType === 'application/pdf' && previewSource">
          <iframe :src="previewSource" class="h-[70vh] w-full rounded bg-white" title="PDF Preview"></iframe>
        </template>
        <template v-else-if="previewProduct.fileType?.startsWith('text/')">
          <pre class="max-h-[60vh] overflow-auto whitespace-pre-wrap rounded bg-base-100 p-4 text-sm">{{ previewText }}</pre>
        </template>
        <template v-else>
          <div class="alert alert-info">
            <span>Định dạng này chưa hỗ trợ xem trước. Vui lòng tải xuống sau khi mua.</span>
          </div>
        </template>
      </div>
    </div>
    <form method="dialog" class="modal-backdrop" @click.self="closePreview">
      <button type="button" @click="closePreview">close</button>
    </form>
  </dialog>
</template>

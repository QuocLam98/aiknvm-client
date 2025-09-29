<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  currentPage: number
  perPage: number
  totalItems: number
  perPageOptions?: number[]
  maxButtons?: number
  showSummary?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  perPageOptions: () => [10, 20, 50, 100],
  maxButtons: 5,
  showSummary: true
})

const emit = defineEmits<{
  (e: 'update:page', value: number): void
  (e: 'update:perPage', value: number): void
}>()

const totalPages = computed(() => Math.max(1, Math.ceil(props.totalItems / props.perPage)))

const pageTokens = computed<(number | string)[]>(() => {
  const pages: (number | string)[] = []
  const total = totalPages.value
  const current = props.currentPage
  const maxButtons = props.maxButtons

  if (total <= maxButtons + 2) {
    for (let i = 1; i <= total; i++) pages.push(i)
    return pages
  }

  const half = Math.floor(maxButtons / 2)
  let start = Math.max(2, current - half)
  let end = Math.min(total - 1, current + half)

  if (current <= half) {
    start = 2
    end = 1 + maxButtons
  } else if (current > total - half) {
    start = total - maxButtons
    end = total - 1
  }

  pages.push(1)
  if (start > 2) pages.push('…')
  for (let i = start; i <= end; i++) pages.push(i)
  if (end < total - 1) pages.push('…')
  pages.push(total)
  return pages
})

const fromItem = computed(() => (props.totalItems === 0 ? 0 : (props.currentPage - 1) * props.perPage + 1))
const toItem = computed(() => Math.min(props.currentPage * props.perPage, props.totalItems))

function go(page: number) {
  if (page < 1 || page > totalPages.value || page === props.currentPage) return
  emit('update:page', page)
}

function changePerPage(val: string | number) {
  const n = Number(val)
  if (!Number.isNaN(n) && n > 0) {
    emit('update:perPage', n)
  }
}
</script>

<template>
  <div class="flex flex-col gap-3 w-full">
    <div class="flex flex-wrap items-center gap-2">
      <div class="join order-2 md:order-1">
        <button class="join-item btn btn-sm" :disabled="currentPage === 1" @click="go(currentPage - 1)">Prev</button>
        <button
          v-for="token in pageTokens"
          :key="token + '-' + currentPage"
          class="join-item btn btn-sm"
          :disabled="token === '…'"
          :class="{ 'btn-active': token === currentPage }"
          @click="typeof token === 'number' && go(token)"
        >
          {{ token }}
        </button>
        <button class="join-item btn btn-sm" :disabled="currentPage === totalPages" @click="go(currentPage + 1)">Next</button>
      </div>

      <div class="flex items-center gap-2 order-3 md:order-2">
        <select class="select select-bordered select-sm" :value="perPage" @change="changePerPage(($event.target as HTMLSelectElement).value)">
          <option v-for="opt in perPageOptions" :key="opt" :value="opt">{{ opt }}/trang</option>
        </select>
      </div>

      <div v-if="showSummary" class="text-sm text-gray-600 ml-auto order-1 md:order-3">
        Hiển thị {{ fromItem }}–{{ toItem }} / {{ totalItems }} ({{ totalPages }} trang)
      </div>
    </div>
  </div>
</template>

<style scoped>
.btn-active {
  background-color: #2563eb; /* tailwind bg-blue-600 */
  color: #fff;
  border-color: #2563eb;
}
</style>

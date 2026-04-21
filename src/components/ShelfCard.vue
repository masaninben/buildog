<template>
  <div
    class="shelf-card"
    :class="{ archived: item.status === 'archived' }"
    @click="handleClick"
  >
    <div class="cover-wrap">
      <img
        v-if="!imgFailed && displayImageUrl"
        :src="displayImageUrl"
        :alt="displayName"
        class="cover-img"
        @error="imgFailed = true"
        @load="onImgLoad"
      />
      <span v-else class="cover-fallback">{{ displayName }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { ShelfItem } from '../types'
import { productStore } from '../store/products'

const props = defineProps<{ item: ShelfItem }>()
const emit = defineEmits<{ click: [item: ShelfItem] }>()

const imgFailed = ref(false)

// 優先順: 編集者選択 > ユーザー撮影 > 商品DB画像 > 追加時画像
const product = computed(() =>
  props.item.productId ? productStore.getById(props.item.productId) : undefined
)
const displayImageUrl = computed(() =>
  product.value?.selectedImageUrl
  ?? props.item.customImageUrl
  ?? product.value?.imageUrl
  ?? props.item.imageUrl
)
// ユーザーが編集した item.name を優先。product.name は canonical として保持
const displayName = computed(() =>
  props.item.name || product.value?.name || ''
)

function handleClick() {
  emit('click', props.item)
}

function onImgLoad(e: Event) {
  const img = e.target as HTMLImageElement
  if (img.naturalWidth < 10) {
    imgFailed.value = true
  }
}
</script>

<style scoped>
.shelf-card {
  background: var(--bg-card);
  border-radius: 4px;
  padding: 3px;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  box-shadow: var(--shadow-sm);
  border: 1px solid var(--border-faint);
}
.shelf-card:hover {
  transform: scale(1.03);
  box-shadow: var(--shadow-md);
}
.shelf-card.archived {
  filter: grayscale(40%) saturate(0.7);
  opacity: 0.5;
}
.digital-badge-removed {
  display: none; /* 電子アイテム機能廃止 */
  padding: 2px 5px;
  border-radius: 4px;
  letter-spacing: 0.04em;
  line-height: 1.4;
  pointer-events: none;
}

.cover-wrap {
  position: relative;
  width: 100%;
  aspect-ratio: 3 / 4;
  background: #ffffff;
  border-radius: 3px;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 5px;
  box-sizing: border-box;
}

.cover-img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  display: block;
}

.cover-fallback {
  padding: 8px;
  font-size: 10px;
  line-height: 1.5;
  color: var(--accent);
  text-align: center;
  word-break: break-word;
  font-weight: 500;
}
</style>
